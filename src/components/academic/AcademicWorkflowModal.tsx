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

import React, { useState, useEffect, useMemo } from 'react';
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

export const AcademicWorkflowModal: React.FC<AcademicWorkflowModalProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
  onNavigate,
}) => {
  const { user } = useAuth();
  const {
    options,
    activeWorkspace,
    isSelectorOpen,
    selectorStep,
    closeSelector,
    selectWorkspace,
    selectGroupAndUnit,
  } = useWorkspace();

  const isOpen = propIsOpen !== undefined ? propIsOpen : isSelectorOpen;
  const handleClose = () => {
    if (propOnClose) propOnClose();
    closeSelector();
  };

  const role = user?.role || 'DOCENTE';
  const isAdminOrSec = role === 'DIRECTOR' || role === 'SECRETARIA';

  // Paso actual (1: Módulo, 2: Carrera, 3: Aula y Unidades)
  const [step, setStep] = useState<1 | 2 | 3>(selectorStep || 1);
  const [stageFilter, setStageFilter] = useState<'M1' | 'M2' | 'ALL'>('M1');
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const programs = useMemo(() => options?.programs || [], [options?.programs]);
  const modules = useMemo(() => options?.modules || [], [options?.modules]);
  const groups = useMemo(() => options?.groups || [], [options?.groups]);

  // Sincronizar paso si selectorStep cambia externamente
  useEffect(() => {
    if (selectorStep) {
      setStep(selectorStep);
    }
  }, [selectorStep]);

  // Determinar si un módulo es Módulo I o Módulo II
  const getModuleStage = (moduleId: string): 'M1' | 'M2' => {
    const num = Number(moduleId.replace(/\D+/g, ''));
    if (!Number.isNaN(num) && num > 0) {
      return num % 2 === 1 ? 'M1' : 'M2';
    }
    return 'M1';
  };

  // Inicializar selección basada en el espacio activo únicamente al abrir el modal
  useEffect(() => {
    if (!isOpen || !programs.length) return;
    if (activeWorkspace && !activeWorkspace.overview && activeWorkspace.programId) {
      setSelectedProgramId(activeWorkspace.programId);
      if (activeWorkspace.groupId) {
        setSelectedGroupId(activeWorkspace.groupId);
      }
    } else {
      setSelectedProgramId((prev) => prev || programs[0].id);
    }
  }, [isOpen, programs]);

  // Aulas de la carrera seleccionada
  const careerGroups = useMemo(() => {
    if (!selectedProgramId) return [];
    return groups.filter((g) => g.programId === selectedProgramId);
  }, [groups, selectedProgramId]);

  // Aula actualmente seleccionada
  const currentGroup: WorkspaceGroupOption | null = useMemo(() => {
    if (!careerGroups.length) return null;
    return careerGroups.find((g) => g.id === selectedGroupId) || careerGroups[0] || null;
  }, [careerGroups, selectedGroupId]);

  // Actualizar aula seleccionada cuando cambia la carrera
  useEffect(() => {
    if (careerGroups.length > 0) {
      if (!selectedGroupId || !careerGroups.some((g) => g.id === selectedGroupId)) {
        setSelectedGroupId(careerGroups[0].id);
      }
    } else {
      setSelectedGroupId('');
    }
  }, [careerGroups, selectedGroupId]);

  const currentProgram = useMemo(
    () => programs.find((p) => p.id === selectedProgramId) || null,
    [programs, selectedProgramId]
  );

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
    setIsApplying(true);
    setFeedbackMsg(null);
    try {
      const effectiveMode = unitCode === 'EFSRT' ? 'PRACTICE' : mode;
      await selectGroupAndUnit(group, effectiveMode, unitCode);
      handleClose();
      if (targetRoute) {
        navigateTo(targetRoute);
      }
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'error' in err ? String((err as { error: unknown }).error) : 'No se pudo seleccionar la unidad.';
      setFeedbackMsg(msg);
    } finally {
      setIsApplying(false);
    }
  };

  const handleSelectOverview = async () => {
    if (!isAdminOrSec) return;
    setIsApplying(true);
    try {
      await selectWorkspace({ overview: true });
      handleClose();
    } catch {
      // Ignorar
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-fade-in"
    >
      <div
        className="w-full max-w-5xl bg-white dark:bg-[#131C1A] rounded-3xl border border-slate-200/90 dark:border-[#263834] shadow-[0_25px_70px_rgba(0,0,0,0.3)] flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ENCABEZADO DEL ASISTENTE GUIADO */}
        <header className="px-6 py-5 border-b border-slate-200/80 dark:border-[#263834] bg-gradient-to-r from-[#F4FAF8] via-white to-[#F4FAF8] dark:from-[#131C1A] dark:via-[#182220] dark:to-[#131C1A] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#13594A] dark:bg-[#5EEAD4]" />
              <span className="text-[11px] font-bold text-[#13594A] dark:text-[#5EEAD4] uppercase tracking-wider">
                Navegador Académico Guiado 2026
              </span>
            </div>
            <h2
              id="academic-workflow-title"
              className="text-[20px] font-bold text-[#0D382F] dark:text-[#F0FDF8] leading-tight"
            >
              {step === 1 && 'Paso 1: Seleccione el Módulo Formativo / Periodo Lectivo'}
              {step === 2 && 'Paso 2: Seleccione la Carrera Técnica (Especialidad)'}
              {step === 3 && 'Paso 3: Seleccione el Aula y la Unidad Didáctica'}
            </h2>
          </div>

          {/* Barra de progreso de pasos */}
          <div className="flex items-center gap-1.5 self-start sm:self-center">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                step === 1
                  ? 'bg-[#13594A] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-[#182220] text-slate-700 dark:text-slate-300 hover:text-[#13594A] dark:hover:text-[#5EEAD4]'
              }`}
            >
              <span>1. Módulo</span>
              {step > 1 && <span className="text-[10px] text-emerald-300">✓</span>}
            </button>
            <span className="text-slate-300 dark:text-slate-600">→</span>
            <button
              type="button"
              onClick={() => setStep(2)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                step === 2
                  ? 'bg-[#13594A] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-[#182220] text-slate-700 dark:text-slate-300 hover:text-[#13594A] dark:hover:text-[#5EEAD4]'
              }`}
            >
              <span>2. Carrera</span>
              {step > 2 && <span className="text-[10px] text-emerald-300">✓</span>}
            </button>
            <span className="text-slate-300 dark:text-slate-600">→</span>
            <button
              type="button"
              onClick={() => setStep(3)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                step === 3
                  ? 'bg-[#13594A] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-[#182220] text-slate-700 dark:text-slate-300 hover:text-[#13594A] dark:hover:text-[#5EEAD4]'
              }`}
            >
              <span>3. Unidades</span>
            </button>

            {/* Botón cerrar si ya existe un espacio o desea omitir */}
            <button
              type="button"
              onClick={handleClose}
              title="Cerrar ventana"
              aria-label="Cerrar ventana"
              className="ml-2 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#182220] transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        {/* CONTENIDO SCROLLABLE SEGÚN EL PASO ACTIVO */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* ========================================================
              VENTANA 1: SELECCIÓN DE MÓDULO / PERIODO LECTIVO
             ======================================================== */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center max-w-xl mx-auto mb-2">
                <p className="text-[14px] text-slate-600 dark:text-slate-300">
                  Seleccione el periodo lectivo y la etapa formativa con la que va a trabajar.
                  El sistema organizará automáticamente las carreras técnicas y aulas correspondientes.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Opción 1: Módulo I (2026-I) */}
                <button
                  type="button"
                  onClick={() => {
                    setStageFilter('M1');
                    setStep(2);
                  }}
                  className="p-6 rounded-3xl text-left border-2 transition-all duration-200 flex flex-col justify-between group bg-white dark:bg-[#182220] border-slate-200/90 dark:border-[#263834] hover:border-[#13594A] dark:hover:border-[#5EEAD4] hover:shadow-lg cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#E6F4F1] dark:bg-[#132B25] text-[#004034] dark:text-[#5EEAD4] border border-[#13594A]/25">
                        Semestre en Curso · Activo
                      </span>
                      <CalendarIcon className="w-5 h-5 text-[#13594A] dark:text-[#5EEAD4]" />
                    </div>
                    <h3 className="text-[18px] font-bold text-[#172B28] dark:text-[#F0FDF8] group-hover:text-[#13594A] dark:group-hover:text-[#5EEAD4] transition-colors">
                      Módulo I · Periodo 2026-I
                    </h3>
                    <p className="text-[13px] text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                      Marzo 2026 – Julio 2026. Etapa formativa regular con 16 aulas activas,
                      286 estudiantes matriculados y plana docente titular completa.
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-[#263834] flex items-center justify-between text-[13px] font-bold text-[#13594A] dark:text-[#5EEAD4]">
                    <span>Ver Carreras de Módulo I</span>
                    <ArrowForwardIcon className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* Opción 2: Módulo II (2026-II) */}
                <button
                  type="button"
                  onClick={() => {
                    setStageFilter('M2');
                    setStep(2);
                  }}
                  className="p-6 rounded-3xl text-left border-2 transition-all duration-200 flex flex-col justify-between group bg-white dark:bg-[#182220] border-slate-200/90 dark:border-[#263834] hover:border-[#13594A] dark:hover:border-[#5EEAD4] hover:shadow-lg cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60">
                        Segundo Semestre · 2026-II
                      </span>
                      <CalendarIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h3 className="text-[18px] font-bold text-[#172B28] dark:text-[#F0FDF8] group-hover:text-[#13594A] dark:group-hover:text-[#5EEAD4] transition-colors">
                      Módulo II · Periodo 2026-II
                    </h3>
                    <p className="text-[13px] text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                      Agosto 2026 – Diciembre 2026. Segundo semestre formativo planificado
                      para continuidad modular y culminación de especialidad técnica.
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-[#263834] flex items-center justify-between text-[13px] font-bold text-[#13594A] dark:text-[#5EEAD4]">
                    <span>Ver Carreras de Módulo II</span>
                    <ArrowForwardIcon className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* Opción 3: Vista Global Institucional (Solo Secretaría y Dirección) */}
                {isAdminOrSec ? (
                  <button
                    type="button"
                    onClick={handleSelectOverview}
                    disabled={isApplying}
                    className="p-6 rounded-3xl text-left border-2 transition-all duration-200 flex flex-col justify-between group bg-gradient-to-br from-[#F2FBF8] to-white dark:from-[#132B25] dark:to-[#182220] border-[#13594A]/40 dark:border-[#205C4E] hover:border-[#13594A] dark:hover:border-[#5EEAD4] hover:shadow-lg cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#13594A] text-white">
                          Ámbito Institucional
                        </span>
                        <CheckCircleIcon className="w-5 h-5 text-[#13594A] dark:text-[#5EEAD4]" />
                      </div>
                      <h3 className="text-[18px] font-bold text-[#172B28] dark:text-[#F0FDF8] group-hover:text-[#13594A] dark:group-hover:text-[#5EEAD4] transition-colors">
                        Vista Global del CETPRO
                      </h3>
                      <p className="text-[13px] text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                        Supervisión integral de todas las 7 carreras, nóminas consolidadas,
                        mesa de partes y reportes oficiales sin filtrar por unidad didáctica.
                      </p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-[#13594A]/20 dark:border-[#263834] flex items-center justify-between text-[13px] font-bold text-[#13594A] dark:text-[#5EEAD4]">
                      <span>Acceder a Vista Global</span>
                      <ArrowForwardIcon className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                ) : (
                  <div className="p-6 rounded-3xl bg-slate-50 dark:bg-[#182220]/60 border border-slate-200/60 dark:border-[#263834] flex flex-col justify-center text-center">
                    <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">
                      Plataforma Docente
                    </span>
                    <p className="text-[13px] text-slate-600 dark:text-slate-400 mt-2">
                      Seleccione Módulo I para gestionar sus aulas y unidades asignadas del periodo lectivo 2026.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              VENTANA 2: SELECCIÓN DE CARRERA TÉCNICA (ESPECIALIDAD)
             ======================================================== */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#263834]">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#182220] hover:bg-slate-200 dark:hover:bg-[#263834] text-slate-700 dark:text-slate-300 text-[12px] font-bold transition-colors cursor-pointer"
                  >
                    <span>← Volver al Módulo</span>
                  </button>
                  <span className="text-[13px] text-slate-600 dark:text-slate-300 font-medium">
                    Etapa: <strong className="text-[#13594A] dark:text-[#5EEAD4]">{stageFilter === 'M1' ? 'Módulo I (2026-I)' : stageFilter === 'M2' ? 'Módulo II (2026-II)' : 'Todos los Módulos'}</strong>
                  </span>
                </div>
                <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                  {programs.length} carreras formativas disponibles
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {programs.map((prog) => {
                  const isSelected = prog.id === selectedProgramId;
                  const progGroups = groups.filter((g) => g.programId === prog.id);
                  const totalStudents = progGroups.reduce((acc, g) => acc + (g.studentCount || 0), 0);
                  const theme = resolveCareerVisualTheme(prog.id, prog.nombre);

                  return (
                    <button
                      key={prog.id}
                      type="button"
                      onClick={() => {
                        setSelectedProgramId(prog.id);
                        if (progGroups.length > 0) {
                          setSelectedGroupId(progGroups[0].id);
                        }
                        setStep(3);
                      }}
                      className={`text-left rounded-3xl p-3.5 transition-all duration-200 border flex flex-col justify-between group cursor-pointer ${
                        isSelected
                          ? 'bg-[#F2FBF8] dark:bg-[#132B25] border-[#13594A] dark:border-[#5EEAD4] ring-2 ring-[#13594A]/25 dark:ring-[#5EEAD4]/25 shadow-md'
                          : 'bg-white dark:bg-[#182220] border-slate-200/90 dark:border-[#263834] hover:border-[#13594A]/60 hover:shadow-sm'
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
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#13594A] dark:text-[#5EEAD4]">
                              {prog.id}
                            </span>
                            <h4 className="text-[15px] font-bold text-[#172B28] dark:text-[#F0FDF8] leading-snug mt-0.5 group-hover:text-[#13594A] dark:group-hover:text-[#5EEAD4] transition-colors">
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

                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-[#263834] flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <StudentsIcon className="w-3.5 h-3.5 text-[#13594A] dark:text-[#5EEAD4]" />
                          {totalStudents} matriculados
                        </span>
                        <span className="font-bold text-[#13594A] dark:text-[#5EEAD4] group-hover:underline">
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#263834]">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#182220] hover:bg-slate-200 dark:hover:bg-[#263834] text-slate-700 dark:text-slate-300 text-[12px] font-bold transition-colors cursor-pointer"
                  >
                    <span>← Volver a Carreras</span>
                  </button>
                  <span className="text-[13px] text-slate-600 dark:text-slate-300 font-medium">
                    Carrera seleccionada: <strong className="text-[#13594A] dark:text-[#5EEAD4]">{currentProgram.nombre}</strong>
                  </span>
                </div>
                <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                  {careerGroups.length} {careerGroups.length === 1 ? 'aula habilitada' : 'aulas habilitadas'}
                </span>
              </div>

              {/* Selector de Aula / Turno / Sección */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-2.5">
                  1. Seleccione el Aula / Turno de la Carrera:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {careerGroups.map((grp) => {
                    const isGrpSelected = currentGroup?.id === grp.id;
                    const isMorning = (grp.turno || '').toLowerCase().includes('mañana');

                    return (
                      <button
                        key={grp.id}
                        type="button"
                        onClick={() => setSelectedGroupId(grp.id)}
                        className={`text-left p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                          isGrpSelected
                            ? 'bg-[#F2FBF8] dark:bg-[#132B25] border-[#13594A] dark:border-[#5EEAD4] ring-2 ring-[#13594A]/25 shadow-sm'
                            : 'bg-white dark:bg-[#182220] border-slate-200/90 dark:border-[#263834] hover:border-[#13594A]/50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200/80">
                              {isMorning ? <SunIcon className="w-3 h-3 text-amber-600" /> : <SunsetIcon className="w-3 h-3 text-indigo-500" />}
                              Turno {grp.turno || 'Mañana'}
                            </span>
                            <span className="text-[10px] font-bold text-[#13594A] dark:text-[#5EEAD4]">
                              Secc. {grp.section || 'A1'}
                            </span>
                          </div>
                          <h4 className="text-[13px] font-bold text-[#172B28] dark:text-[#F0FDF8] leading-tight">
                            {grp.name}
                          </h4>
                          {grp.teacherName && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 truncate">
                              Prof. {grp.teacherName}
                            </p>
                          )}
                        </div>
                        <div className="pt-2 border-t border-slate-100 dark:border-[#263834] flex items-center justify-between text-[11px] font-semibold text-[#13594A] dark:text-[#5EEAD4]">
                          <span>{grp.studentCount} matriculados</span>
                          <span>{isGrpSelected ? 'Seleccionada ✓' : 'Elegir'}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Unidades Didácticas del Aula Seleccionada */}
              {currentGroup && (
                <div className="pt-4 border-t border-slate-200/80 dark:border-[#263834] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                        2. Haga clic en la Unidad Didáctica que desea gestionar:
                      </span>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Al hacer clic, el sistema abrirá el espacio de trabajo con esa unidad activa.
                      </p>
                    </div>

                    {/* Acceso a Módulo Completo para Secretaría / Dirección */}
                    {isAdminOrSec && (
                      <button
                        type="button"
                        disabled={isApplying}
                        onClick={() => handleSelectUnit(currentGroup, 'MODULE', undefined, 'matriculas')}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#182220] hover:bg-[#13594A] hover:text-white dark:hover:bg-[#1A6B5A] text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-[#263834] text-[12px] font-bold transition-all shadow-xs shrink-0 cursor-pointer"
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
                              ? 'bg-[#F2FBF8] dark:bg-[#132B25] border-[#13594A] dark:border-[#5EEAD4] ring-2 ring-[#13594A]/25 shadow-sm'
                              : 'bg-white dark:bg-[#182220] border-slate-200/90 dark:border-[#263834] hover:border-[#13594A]/50 hover:shadow-xs'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#13594A] text-white text-[11px] font-bold">
                                {unit.code} · Unidad {idx + 1}
                              </span>
                              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                {unit.hours ? <span>{unit.hours} h</span> : null}
                                {unit.hours && unit.credits ? <span>·</span> : null}
                                {unit.credits ? <span>{unit.credits} créd.</span> : null}
                              </div>
                            </div>

                            <h4 className="text-[14px] font-bold text-[#172B28] dark:text-[#F0FDF8] leading-snug">
                              {unit.name || `Unidad Didáctica ${unit.code}`}
                            </h4>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#263834] space-y-2">
                            {/* Botón Principal: Entrar a gestionar */}
                            <button
                              type="button"
                              disabled={isApplying}
                              onClick={() => handleSelectUnit(currentGroup, 'UNIT', unit.code)}
                              className="w-full py-2.5 px-4 rounded-xl bg-[#13594A] hover:bg-[#0E4438] active:bg-[#0B372D] text-white font-bold text-[12px] tracking-wide flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                            >
                              <span>Ingresar a Gestionar esta Unidad</span>
                              <ArrowForwardIcon className="w-3.5 h-3.5" />
                            </button>

                            {/* Accesos directos rápidos */}
                            <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                              <button
                                type="button"
                                disabled={isApplying}
                                onClick={() => handleSelectUnit(currentGroup, 'UNIT', unit.code, 'asistencia')}
                                className="p-1.5 rounded-lg bg-slate-50 dark:bg-[#131C1A] hover:bg-[#E6F4F1] dark:hover:bg-[#192825] text-slate-700 dark:text-slate-300 hover:text-[#13594A] dark:hover:text-[#5EEAD4] font-bold border border-slate-200/80 dark:border-[#263834] transition-colors cursor-pointer text-center"
                              >
                                Asistencia
                              </button>
                              <button
                                type="button"
                                disabled={isApplying}
                                onClick={() => handleSelectUnit(currentGroup, 'UNIT', unit.code, 'evaluacion')}
                                className="p-1.5 rounded-lg bg-slate-50 dark:bg-[#131C1A] hover:bg-[#E6F4F1] dark:hover:bg-[#192825] text-slate-700 dark:text-slate-300 hover:text-[#13594A] dark:hover:text-[#5EEAD4] font-bold border border-slate-200/80 dark:border-[#263834] transition-colors cursor-pointer text-center"
                              >
                                Notas
                              </button>
                              <button
                                type="button"
                                disabled={isApplying}
                                onClick={() => handleSelectUnit(currentGroup, 'UNIT', unit.code, 'documentos')}
                                className="p-1.5 rounded-lg bg-slate-50 dark:bg-[#131C1A] hover:bg-[#E6F4F1] dark:hover:bg-[#192825] text-slate-700 dark:text-slate-300 hover:text-[#13594A] dark:hover:text-[#5EEAD4] font-bold border border-slate-200/80 dark:border-[#263834] transition-colors cursor-pointer text-center"
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
                      <div className="rounded-2xl p-4 border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-700 text-white text-[11px] font-bold">
                              EFSRT · Prácticas
                            </span>
                            <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                              {efsrtUnit.hours || 192} h · {efsrtUnit.credits || 6} créd.
                            </span>
                          </div>
                          <h4 className="text-[14px] font-bold text-amber-950 dark:text-amber-200 leading-snug">
                            Experiencias Formativas en Situaciones Reales de Trabajo
                          </h4>
                          <p className="text-[11px] text-amber-900/80 dark:text-amber-300/80 mt-1">
                            Evaluación y acta de prácticas formativas de taller y empresa (Formato TMPL-18).
                          </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-amber-200/60 dark:border-amber-800/40">
                          <button
                            type="button"
                            disabled={isApplying}
                            onClick={() => handleSelectUnit(currentGroup, 'PRACTICE', 'EFSRT', 'documentos')}
                            className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[12px] tracking-wide flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
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
        <footer className="px-6 py-4 border-t border-slate-200/80 dark:border-[#263834] bg-slate-50 dark:bg-[#182220] flex items-center justify-between text-[12px]">
          <span className="text-slate-500 dark:text-slate-400">
            {step === 1 && 'Paso 1 de 3 · Selección de Módulo'}
            {step === 2 && 'Paso 2 de 3 · Selección de Carrera'}
            {step === 3 && 'Paso 3 de 3 · Selección de Aula y Unidad Didáctica'}
          </span>
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-xl bg-white dark:bg-[#131C1A] border border-slate-200 dark:border-[#263834] text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-[#182220] transition-colors cursor-pointer"
          >
            Cerrar Asistente
          </button>
        </footer>
      </div>
    </div>
  );
};

export default AcademicWorkflowModal;
