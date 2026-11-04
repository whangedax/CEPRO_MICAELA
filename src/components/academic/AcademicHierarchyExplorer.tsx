/**
 * src/components/academic/AcademicHierarchyExplorer.tsx
 *
 * Panel Jerárquico e Interactivo de Gestión Académica — CEPRO_MICAELA 2.0.
 * Permite a Secretaría Académica, Dirección y Docentes navegar de forma
 * guiada y visual por la estructura formativa institucional:
 *   1. Elegir el Módulo / Periodo Lectivo (Módulo I · 2026-I, Módulo II · 2026-II o Todos).
 *   2. Elegir la Carrera Técnica (Especialidad) con su imagen descriptiva, módulo y estadísticas.
 *   3. Elegir el Aula / Turno / Sección (ej. Mañana A1, Mañana A2, Tarde B, Noche C).
 *   4. Ver y seleccionar las Unidades Didácticas correspondientes (UD1..UD7, EFSRT o Módulo Completo)
 *      con acceso directo con un clic a Matrículas, Estudiantes, Asistencia, Evaluación,
 *      Documentos Oficiales y Configuración Documental.
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
  StudentsIcon,
  EnrollmentIcon,
  AttendanceIcon,
  EvaluationIcon,
  DocumentIcon,
  DocConfigIcon,
  CheckCircleIcon,
  SunIcon,
  SunsetIcon,
  CalendarIcon,
  ArrowForwardIcon,
} from '../ui/Icons';

export interface AcademicHierarchyExplorerProps {
  onNavigate?: (route: NavRoute) => void;
  title?: string;
  subtitle?: string;
}

export const AcademicHierarchyExplorer: React.FC<AcademicHierarchyExplorerProps> = ({
  onNavigate,
  title,
  subtitle,
}) => {
  const { user } = useAuth();
  const {
    options,
    activeWorkspace,
    isLoading,
    selectWorkspace,
    selectGroupAndUnit,
  } = useWorkspace();

  const role = user?.role || 'DOCENTE';
  const isAdminOrSec = role === 'DIRECTOR' || role === 'SECRETARIA';

  // Paso 1: Filtro de Etapa Modular / Periodo ('ALL' | 'M1' | 'M2')
  const [stageFilter, setStageFilter] = useState<'ALL' | 'M1' | 'M2'>('ALL');
  // Paso 2: Carrera seleccionada (programId)
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  // Paso 3: Módulo seleccionado (moduleId)
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  // Paso 4: Aula seleccionada (groupId)
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  // Estado de guardado de contexto
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const programs = useMemo(() => options?.programs || [], [options?.programs]);
  const modules = useMemo(() => options?.modules || [], [options?.modules]);
  const groups = useMemo(() => options?.groups || [], [options?.groups]);

  // Determinar si un módulo es Módulo I (impar: MOD-001, 003, 005...) o Módulo II (par: MOD-002, 004, 006...)
  const getModuleStage = (moduleId: string): 'M1' | 'M2' => {
    const num = Number(moduleId.replace(/\D+/g, ''));
    if (!Number.isNaN(num) && num > 0) {
      return num % 2 === 1 ? 'M1' : 'M2';
    }
    return 'M1';
  };

  // Sincronizar selección inicial cuando cargan las opciones o cambia el workspace activo externamente
  useEffect(() => {
    if (!programs.length) return;

    if (activeWorkspace && !activeWorkspace.overview && activeWorkspace.programId) {
      setSelectedProgramId(activeWorkspace.programId);
      if (activeWorkspace.moduleId) {
        setSelectedModuleId(activeWorkspace.moduleId);
      }
      if (activeWorkspace.groupId) {
        setSelectedGroupId(activeWorkspace.groupId);
      }
      return;
    }

    setSelectedProgramId((prev) => (prev && programs.some((p) => p.id === prev) ? prev : programs[0].id));
  }, [programs, activeWorkspace]);

  // Módulos disponibles para la carrera seleccionada y el filtro de etapa
  const careerModules = useMemo(() => {
    if (!selectedProgramId) return [];
    const byProgram = modules.filter((m) => {
      if (m.programId) return m.programId === selectedProgramId;
      return groups.some((g) => g.programId === selectedProgramId && g.moduleId === m.id);
    });
    if (stageFilter === 'ALL') return byProgram;
    return byProgram.filter((m) => getModuleStage(m.id) === stageFilter);
  }, [modules, groups, selectedProgramId, stageFilter]);

  // Actualizar módulo seleccionado cuando cambia la carrera o el filtro de etapa
  useEffect(() => {
    if (!careerModules.length) {
      setSelectedModuleId('');
      return;
    }
    if (!selectedModuleId || !careerModules.some((m) => m.id === selectedModuleId)) {
      // Preferir un módulo con grupos activos
      const modWithGroups = careerModules.find((m) =>
        groups.some((g) => g.programId === selectedProgramId && g.moduleId === m.id)
      );
      setSelectedModuleId((modWithGroups || careerModules[0]).id);
    }
  }, [careerModules, groups, selectedProgramId, selectedModuleId]);

  // Aulas (Secciones/Turnos) disponibles para la carrera y módulo seleccionados
  const filteredGroups = useMemo(() => {
    if (!selectedProgramId) return [];
    const byModule = groups.filter(
      (g) => g.programId === selectedProgramId && (!selectedModuleId || g.moduleId === selectedModuleId)
    );
    if (byModule.length > 0) return byModule;
    // Si el usuario eligió Módulo II (2026-II) que aún no tiene sección abierta en 2026-I, mostrar aulas de la carrera
    return groups.filter((g) => g.programId === selectedProgramId);
  }, [groups, selectedProgramId, selectedModuleId]);

  // Actualizar aula seleccionada cuando cambian las aulas filtradas
  useEffect(() => {
    if (!filteredGroups.length) {
      setSelectedGroupId('');
      return;
    }
    if (!selectedGroupId || !filteredGroups.some((g) => g.id === selectedGroupId)) {
      setSelectedGroupId(filteredGroups[0].id);
    }
  }, [filteredGroups, selectedGroupId]);

  const currentProgram = useMemo(
    () => programs.find((p) => p.id === selectedProgramId) || null,
    [programs, selectedProgramId]
  );

  const currentModule = useMemo(
    () => modules.find((m) => m.id === selectedModuleId) || null,
    [modules, selectedModuleId]
  );

  const currentGroup: WorkspaceGroupOption | null = useMemo(
    () => filteredGroups.find((g) => g.id === selectedGroupId) || filteredGroups[0] || null,
    [filteredGroups, selectedGroupId]
  );

  // Unidades didácticas a mostrar (del aula activa, excluyendo EFSRT que se muestra en su tarjeta dedicada)
  const pedagogicalUnits: WorkspaceUnitOption[] = useMemo(() => {
    if (!currentGroup) return [];
    return (currentGroup.units || []).filter((u) => u.code !== 'EFSRT');
  }, [currentGroup]);

  const efsrtUnit: WorkspaceUnitOption | null = useMemo(() => {
    if (!currentGroup) return null;
    return (currentGroup.units || []).find((u) => u.code === 'EFSRT') || null;
  }, [currentGroup]);

  const navigateTo = (route: NavRoute) => {
    if (onNavigate) {
      onNavigate(route);
    } else {
      window.location.hash = `#/${route}`;
    }
  };

  // Activar contexto en el backend (POST /api/workspace) y opcionalmente navegar a una pantalla
  const handleActivateContext = async (
    group: WorkspaceGroupOption,
    mode: 'UNIT' | 'MODULE' | 'PRACTICE',
    unitCode?: string,
    targetRoute?: NavRoute
  ) => {
    setIsApplying(true);
    setFeedbackMsg(null);
    try {
      await selectGroupAndUnit(group, mode, unitCode);
      const label =
        mode === 'UNIT'
          ? `Unidad ${unitCode}`
          : mode === 'PRACTICE'
          ? 'Prácticas EFSRT'
          : 'Módulo Completo';
      setFeedbackMsg(`Espacio activado: ${group.name} (${label})`);
      if (targetRoute) {
        navigateTo(targetRoute);
      }
    } catch {
      // El error ya es capturado por WorkspaceContext
    } finally {
      setIsApplying(false);
    }
  };

  const handleReturnToOverview = async () => {
    if (!isAdminOrSec) return;
    setIsApplying(true);
    setFeedbackMsg(null);
    try {
      await selectWorkspace({ overview: true });
      setFeedbackMsg('Vista Global Institucional restablecida (todas las carreras y módulos).');
    } catch {
      // Ignorar
    } finally {
      setIsApplying(false);
    }
  };

  if (isLoading && !options) {
    return (
      <section className="p-6 rounded-3xl bg-white dark:bg-[#182220] border border-slate-200/80 dark:border-[#263834] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-[#13594A]/20 border-t-[#13594A] dark:border-t-[#5EEAD4] rounded-full animate-spin" />
          <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
            Cargando explorador de carreras, módulos formativos y unidades didácticas...
          </span>
        </div>
      </section>
    );
  }

  if (!programs.length) {
    return null;
  }

  const isGlobalOverview = !activeWorkspace || Boolean(activeWorkspace.overview);

  return (
    <section
      aria-label="Explorador Jerárquico de Carreras, Módulos y Unidades Didácticas"
      className="bg-white dark:bg-[#182220] rounded-3xl border border-slate-200/90 dark:border-[#263834] shadow-[0_6px_28px_rgba(0,0,0,0.04)] overflow-hidden"
    >
      {/* Cabecera del Explorador Jerárquico */}
      <div className="p-6 border-b border-slate-200/80 dark:border-[#263834] bg-gradient-to-r from-[#F4FAF8] via-white to-[#F4FAF8] dark:from-[#131C1A] dark:via-[#182220] dark:to-[#131C1A]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#13594A] text-white text-[10px] font-bold uppercase tracking-wider">
                Navegador Guiado 2026
              </span>
              <span className="text-[11px] font-bold text-[#13594A] dark:text-[#5EEAD4]">
                Paso 1: Módulo → Paso 2: Carrera → Paso 3: Aula y Unidades Didácticas
              </span>
            </div>
            <h2 className="text-[20px] text-[#0D382F] dark:text-[#F0FDF8] font-bold tracking-tight">
              {title ||
                (role === 'SECRETARIA'
                  ? 'Panel de Carreras, Módulos Formativos y Unidades Didácticas'
                  : role === 'DIRECTOR'
                  ? 'Supervisión por Carrera, Módulo Formativo y Unidades Didácticas'
                  : 'Explorador de Mis Carreras, Módulos y Unidades Didácticas')}
            </h2>
            <p className="text-[13px] text-slate-600 dark:text-slate-300 mt-0.5">
              {subtitle ||
                'Seleccione primero la etapa modular y la carrera técnica para visualizar sus aulas, unidades didácticas correspondientes y abrir directamente matrículas, asistencia, notas o documentos oficiales.'}
            </p>
          </div>

          {/* Selector de Etapa Modular (Paso 1) + Botón Vista Global */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div
              role="group"
              aria-label="Filtrar por etapa modular"
              className="inline-flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-[#131C1A] border border-slate-200/80 dark:border-[#263834]"
            >
              <button
                type="button"
                onClick={() => setStageFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all ${
                  stageFilter === 'ALL'
                    ? 'bg-[#13594A] text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-[#13594A] dark:hover:text-[#5EEAD4]'
                }`}
              >
                Todos los Módulos
              </button>
              <button
                type="button"
                onClick={() => setStageFilter('M1')}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all ${
                  stageFilter === 'M1'
                    ? 'bg-[#13594A] text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-[#13594A] dark:hover:text-[#5EEAD4]'
                }`}
              >
                Módulo I (2026-I)
              </button>
              <button
                type="button"
                onClick={() => setStageFilter('M2')}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all ${
                  stageFilter === 'M2'
                    ? 'bg-[#13594A] text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-[#13594A] dark:hover:text-[#5EEAD4]'
                }`}
              >
                Módulo II (2026-II)
              </button>
            </div>

            {isAdminOrSec && !isGlobalOverview && (
              <button
                type="button"
                onClick={handleReturnToOverview}
                disabled={isApplying}
                className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-[12px] font-bold hover:bg-amber-100 transition-colors"
              >
                Ver Todo el CETPRO (Vista Global)
              </button>
            )}
          </div>
        </div>

        {/* Estado actual del Espacio de Trabajo */}
        <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-[#263834] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <span className="font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[10px]">
              Contexto Activo:
            </span>
            {isGlobalOverview ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#131C1A] text-slate-800 dark:text-slate-200 font-semibold border border-slate-200 dark:border-[#263834]">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Vista Global Institucional ({programs.length} carreras · {groups.length} aulas activas)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#E6F4F1] dark:bg-[#132B25] text-[#004034] dark:text-[#5EEAD4] font-bold border border-[#13594A]/25 dark:border-[#205C4E]">
                <CheckCircleIcon className="w-3.5 h-3.5 text-[#13594A] dark:text-[#5EEAD4]" />
                {programs.find((p) => p.id === activeWorkspace?.programId)?.nombre || activeWorkspace?.programId}
                {' · '}
                {groups.find((g) => g.id === activeWorkspace?.groupId)?.name || activeWorkspace?.groupId}
                {' · '}
                {activeWorkspace?.mode === 'UNIT'
                  ? `Unidad ${activeWorkspace.unit}`
                  : activeWorkspace?.mode === 'PRACTICE'
                  ? 'Prácticas EFSRT'
                  : 'Módulo Completo'}
              </span>
            )}
          </div>

          {feedbackMsg && (
            <span className="text-[12px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
              {feedbackMsg}
            </span>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* PASO 2: TARJETAS VISUALES DE CARRERAS (ESPECIALIDADES) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#13594A] text-white text-[11px] flex items-center justify-center font-bold">
                1
              </span>
              Seleccione la Carrera Técnica (Especialidad)
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {programs.length} {programs.length === 1 ? 'carrera disponible' : 'carreras oficiales'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {programs.map((prog) => {
              const isSelected = prog.id === selectedProgramId;
              const progGroups = groups.filter((g) => g.programId === prog.id);
              const totalStudents = progGroups.reduce((acc, g) => acc + (g.studentCount || 0), 0);
              const progModules = modules.filter(
                (m) => m.programId === prog.id || progGroups.some((g) => g.moduleId === m.id)
              );
              const theme = resolveCareerVisualTheme(prog.id, prog.nombre);

              return (
                <button
                  key={prog.id}
                  type="button"
                  onClick={() => setSelectedProgramId(prog.id)}
                  className={`text-left rounded-2xl p-3.5 transition-all duration-200 border flex flex-col justify-between group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13594A] ${
                    isSelected
                      ? 'bg-[#F2FBF8] dark:bg-[#132B25] border-[#13594A] dark:border-[#5EEAD4] ring-2 ring-[#13594A]/25 dark:ring-[#5EEAD4]/25 shadow-md'
                      : 'bg-white dark:bg-[#131C1A] border-slate-200/80 dark:border-[#263834] hover:border-[#13594A]/50 dark:hover:border-[#205C4E] hover:shadow-sm'
                  }`}
                >
                  <div>
                    <CareerVisualBanner
                      programId={prog.id}
                      programName={prog.nombre}
                      instanceId={`explorer-${prog.id}`}
                      heightClass="h-28"
                      rightBadgeText={`${progGroups.length} ${progGroups.length === 1 ? 'aula' : 'aulas'}`}
                      showToolsFooter={false}
                    />
                    <div className="mt-3 flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#13594A] dark:text-[#5EEAD4]">
                          {prog.id} · {progModules.length} {progModules.length === 1 ? 'Módulo' : 'Módulos'}
                        </span>
                        <h4 className="text-[15px] font-bold text-[#172B28] dark:text-[#F0FDF8] leading-snug mt-0.5">
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

                  <div className="mt-3 pt-2.5 border-t border-slate-200/70 dark:border-[#263834] flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <StudentsIcon className="w-3.5 h-3.5 text-[#13594A] dark:text-[#5EEAD4]" />
                      {totalStudents} matriculados
                    </span>
                    <span
                      className={`font-bold ${
                        isSelected
                          ? 'text-[#13594A] dark:text-[#5EEAD4]'
                          : 'text-slate-500 dark:text-slate-400 group-hover:text-[#13594A]'
                      }`}
                    >
                      {isSelected ? 'Carrera activa ✓' : 'Elegir carrera →'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* PASO 3: SELECCIÓN DE MÓDULO FORMATIVO Y AULA / TURNO / SECCIÓN */}
        {currentProgram && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2 border-t border-slate-200/70 dark:border-[#263834]">
            {/* Columna Izquierda: Módulos Formativos de la Carrera */}
            <div className="lg:col-span-5 space-y-3">
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#13594A] text-white text-[11px] flex items-center justify-center font-bold">
                  2
                </span>
                Módulo Formativo de {currentProgram.nombre}
              </h3>

              <div className="space-y-2.5">
                {careerModules.map((mod) => {
                  const isModSelected = mod.id === selectedModuleId;
                  const stage = getModuleStage(mod.id);
                  const modGroups = groups.filter((g) => g.moduleId === mod.id);

                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => setSelectedModuleId(mod.id)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                        isModSelected
                          ? 'bg-[#E6F4F1] dark:bg-[#132B25] border-[#13594A] dark:border-[#5EEAD4] shadow-xs'
                          : 'bg-slate-50/70 dark:bg-[#131C1A] border-slate-200/80 dark:border-[#263834] hover:border-[#13594A]/40'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-[#13594A]/15 dark:bg-[#205C4E]/40 text-[#004034] dark:text-[#5EEAD4] text-[10px] font-bold uppercase">
                            {stage === 'M1' ? 'Módulo I · 2026-I' : 'Módulo II · 2026-II'}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            {mod.id}
                          </span>
                        </div>
                        <p className="text-[14px] font-bold text-[#172B28] dark:text-[#F0FDF8] mt-1 leading-snug">
                          {mod.nombre}
                        </p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                          {modGroups.length > 0
                            ? `${modGroups.length} ${modGroups.length === 1 ? 'sección activa' : 'secciones activas'} en 2026-I`
                            : 'Programado para el semestre 2026-II (Agosto - Diciembre)'}
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 ${
                          isModSelected
                            ? 'bg-[#13594A] text-white'
                            : 'bg-white dark:bg-[#182220] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#263834]'
                        }`}
                      >
                        {isModSelected ? 'Activo' : 'Ver'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Columna Derecha: Aulas / Turnos / Secciones de la Carrera */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#13594A] text-white text-[11px] flex items-center justify-center font-bold">
                    3
                  </span>
                  Aula, Turno y Sección ({filteredGroups.length})
                </h3>
                {currentModule && (
                  <span className="text-[11px] font-semibold text-[#13594A] dark:text-[#5EEAD4]">
                    {currentModule.nombre}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredGroups.map((grp) => {
                  const isGrpSelected = currentGroup?.id === grp.id;
                  const isMorning = (grp.turno || '').toLowerCase().includes('mañana');
                  const isNight = (grp.turno || '').toLowerCase().includes('noche');

                  return (
                    <button
                      key={grp.id}
                      type="button"
                      onClick={() => setSelectedGroupId(grp.id)}
                      className={`text-left p-4 rounded-2xl border transition-all flex flex-col justify-between gap-2 ${
                        isGrpSelected
                          ? 'bg-[#F2FBF8] dark:bg-[#132B25] border-[#13594A] dark:border-[#5EEAD4] ring-1 ring-[#13594A]/30 shadow-xs'
                          : 'bg-slate-50/70 dark:bg-[#131C1A] border-slate-200/80 dark:border-[#263834] hover:border-[#13594A]/40'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60">
                            {isMorning ? (
                              <SunIcon className="w-3 h-3 text-amber-600" />
                            ) : (
                              <SunsetIcon className="w-3 h-3 text-indigo-500" />
                            )}
                            Turno {grp.turno || 'Mañana'} · Sección {grp.section || 'A1'}
                          </span>
                          <span className="text-[11px] font-bold text-[#13594A] dark:text-[#5EEAD4]">
                            {grp.periodId}
                          </span>
                        </div>

                        <h4 className="text-[14px] font-bold text-[#172B28] dark:text-[#F0FDF8] leading-snug">
                          {grp.name}
                        </h4>

                        {grp.teacherName && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 font-medium">
                            Docente: <span className="font-bold">{grp.teacherName}</span>
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 dark:border-[#263834] flex items-center justify-between text-[11px]">
                        <span className="font-bold text-[#13594A] dark:text-[#5EEAD4] flex items-center gap-1">
                          <StudentsIcon className="w-3.5 h-3.5" />
                          {grp.studentCount} estudiantes
                        </span>
                        <span className="text-slate-600 dark:text-slate-400 font-semibold">
                          {isNight ? 'Horario Nocturno' : grp.units.length + ' unidades'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* PASO 4: UNIDADES DIDÁCTICAS CORRESPONDIENTES Y ACCIONES DIRECTAS */}
        {currentGroup && (
          <div className="pt-5 border-t border-slate-200/80 dark:border-[#263834] space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50 dark:bg-[#131C1A] p-4 rounded-2xl border border-slate-200/80 dark:border-[#263834]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#13594A] text-white text-[11px] flex items-center justify-center font-bold">
                    4
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#13594A] dark:text-[#5EEAD4]">
                    Unidades Didácticas y Gestión del Aula Seleccionada
                  </span>
                </div>
                <h3 className="text-[17px] font-bold text-[#172B28] dark:text-[#F0FDF8] mt-1">
                  {currentGroup.name.toLowerCase().includes((currentProgram?.nombre || '').toLowerCase()) || (currentProgram?.nombre || '').toLowerCase().includes(currentGroup.name.toLowerCase())
                    ? currentGroup.name
                    : `${currentProgram?.nombre} — ${currentGroup.name}`}
                </h3>
                <p className="text-[12px] text-slate-600 dark:text-slate-300">
                  Módulo: <span className="font-semibold">{ getModuleNameFromList(modules, currentGroup.moduleId) }</span>
                  {currentGroup.teacherName ? ` · Docente responsable: ${currentGroup.teacherName}` : ''}
                  {` · ${currentGroup.studentCount} participantes matriculados`}
                </p>
              </div>

              {/* Botones de Gestión a Nivel de Módulo / Aula Completa */}
              <div className="flex flex-wrap items-center gap-2">
                {isAdminOrSec && (
                  <button
                    type="button"
                    disabled={isApplying}
                    onClick={() => handleActivateContext(currentGroup, 'MODULE', undefined, 'matriculas')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#13594A] text-white text-[12px] font-bold hover:bg-[#004034] transition-colors shadow-xs"
                  >
                    <EnrollmentIcon className="w-4 h-4" />
                    Gestionar Matrículas
                  </button>
                )}
                <button
                  type="button"
                  disabled={isApplying}
                  onClick={() => handleActivateContext(currentGroup, 'MODULE', undefined, 'estudiantes')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#182220] text-[#172B28] dark:text-[#F0FDF8] border border-slate-300 dark:border-[#263834] text-[12px] font-bold hover:border-[#13594A] transition-colors"
                >
                  <StudentsIcon className="w-4 h-4 text-[#13594A] dark:text-[#5EEAD4]" />
                  Padrón de Estudiantes ({currentGroup.studentCount})
                </button>
                <button
                  type="button"
                  disabled={isApplying}
                  onClick={() => handleActivateContext(currentGroup, 'MODULE', undefined, 'documentos')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#182220] text-[#172B28] dark:text-[#F0FDF8] border border-slate-300 dark:border-[#263834] text-[12px] font-bold hover:border-[#13594A] transition-colors"
                >
                  <DocumentIcon className="w-4 h-4 text-[#13594A] dark:text-[#5EEAD4]" />
                  Nóminas, Actas y Certificados
                </button>
              </div>
            </div>

            {/* Grilla de Unidades Didácticas Correspondientes (UD1, UD2, UD3, UD4...) */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {pedagogicalUnits.map((unit, idx) => {
                const isUnitActive =
                  activeWorkspace?.groupId === currentGroup.id &&
                  activeWorkspace?.mode === 'UNIT' &&
                  activeWorkspace?.unit === unit.code;
                const fechaInicio = typeof unit.fechaInicio === 'string' ? unit.fechaInicio : '';
                const fechaFin = typeof unit.fechaFin === 'string' ? unit.fechaFin : '';

                return (
                  <div
                    key={unit.code}
                    className={`rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                      isUnitActive
                        ? 'bg-[#F2FBF8] dark:bg-[#132B25] border-[#13594A] dark:border-[#5EEAD4] ring-1 ring-[#13594A]/30 shadow-sm'
                        : 'bg-white dark:bg-[#131C1A] border-slate-200/90 dark:border-[#263834] hover:border-[#13594A]/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#13594A] text-white text-[11px] font-bold">
                          {unit.code} · Unidad {idx + 1}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                          {unit.hours ? <span>{unit.hours} h</span> : null}
                          {unit.hours && unit.credits ? <span>·</span> : null}
                          {unit.credits ? <span>{unit.credits} créd.</span> : null}
                        </div>
                      </div>

                      <h4 className="text-[14px] font-bold text-[#172B28] dark:text-[#F0FDF8] leading-snug">
                        {unit.name || `Unidad Didáctica ${unit.code}`}
                      </h4>

                      {(fechaInicio || fechaFin) && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1.5 flex items-center gap-1.5">
                          <CalendarIcon className="w-3.5 h-3.5 text-[#13594A] dark:text-[#5EEAD4]" />
                          <span>
                            {fechaInicio || 'Inicio'} al {fechaFin || ' Término'}
                          </span>
                        </p>
                      )}
                    </div>

                    {/* Botones de Acción Directa para esta Unidad Didáctica */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#263834] grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={isApplying}
                        onClick={() => handleActivateContext(currentGroup, 'UNIT', unit.code, 'asistencia')}
                        className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-[#E6F4F1] dark:bg-[#182220] text-[#004034] dark:text-[#5EEAD4] border border-[#13594A]/20 dark:border-[#263834] text-[11px] font-bold hover:bg-[#13594A] hover:text-white transition-colors"
                      >
                        <AttendanceIcon className="w-3.5 h-3.5" />
                        Asistencia
                      </button>
                      <button
                        type="button"
                        disabled={isApplying}
                        onClick={() => handleActivateContext(currentGroup, 'UNIT', unit.code, 'evaluacion')}
                        className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-[#E6F4F1] dark:bg-[#182220] text-[#004034] dark:text-[#5EEAD4] border border-[#13594A]/20 dark:border-[#263834] text-[11px] font-bold hover:bg-[#13594A] hover:text-white transition-colors"
                      >
                        <EvaluationIcon className="w-3.5 h-3.5" />
                        Evaluación (Notas)
                      </button>
                      <button
                        type="button"
                        disabled={isApplying}
                        onClick={() => handleActivateContext(currentGroup, 'UNIT', unit.code, 'documentos')}
                        className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-[#182220] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[#263834] text-[11px] font-semibold hover:border-[#13594A] transition-colors"
                      >
                        <DocumentIcon className="w-3.5 h-3.5 text-[#13594A] dark:text-[#5EEAD4]" />
                        Formatos PDF
                      </button>
                      <button
                        type="button"
                        disabled={isApplying}
                        onClick={() =>
                          handleActivateContext(currentGroup, 'UNIT', unit.code, 'configuracion-documental')
                        }
                        className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-[#182220] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[#263834] text-[11px] font-semibold hover:border-[#13594A] transition-colors"
                      >
                        <DocConfigIcon className="w-3.5 h-3.5 text-[#13594A] dark:text-[#5EEAD4]" />
                        Capacidades
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Tarjeta Especial para EFSRT (Experiencias Formativas en Situaciones Reales de Trabajo) */}
              {efsrtUnit && (
                <div
                  className={`rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                    activeWorkspace?.groupId === currentGroup.id && activeWorkspace?.mode === 'PRACTICE'
                      ? 'bg-[#F2FBF8] dark:bg-[#132B25] border-[#13594A] dark:border-[#5EEAD4] ring-1 ring-[#13594A]/30 shadow-sm'
                      : 'bg-amber-50/40 dark:bg-[#131C1A] border-amber-200/80 dark:border-[#263834] hover:border-amber-400'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-700 text-white text-[11px] font-bold">
                        EFSRT · Prácticas Preprofesionales
                      </span>
                      <span className="text-[11px] font-bold text-amber-900 dark:text-amber-300">
                        {efsrtUnit.hours || 128} h · {efsrtUnit.credits || 4} créd.
                      </span>
                    </div>

                    <h4 className="text-[14px] font-bold text-[#172B28] dark:text-[#F0FDF8] leading-snug">
                      {efsrtUnit.name || 'Experiencias Formativas en Situaciones Reales de Trabajo'}
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                      Consolidado de evaluación de prácticas EFSRT (Formato Oficial TMPL-18).
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-amber-200/60 dark:border-[#263834] grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isApplying}
                      onClick={() =>
                        handleActivateContext(currentGroup, 'PRACTICE', 'EFSRT', 'configuracion-documental')
                      }
                      className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-amber-100/80 dark:bg-[#182220] text-amber-950 dark:text-amber-200 border border-amber-300 dark:border-[#263834] text-[11px] font-bold hover:bg-amber-700 hover:text-white transition-colors"
                    >
                      <DocConfigIcon className="w-3.5 h-3.5" />
                      Calificar EFSRT
                    </button>
                    <button
                      type="button"
                      disabled={isApplying}
                      onClick={() => handleActivateContext(currentGroup, 'PRACTICE', 'EFSRT', 'documentos')}
                      className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-white dark:bg-[#182220] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[#263834] text-[11px] font-semibold hover:border-amber-600 transition-colors"
                    >
                      <DocumentIcon className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                      Acta EFSRT
                      <ArrowForwardIcon className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

function getModuleNameFromList(modules: { id: string; nombre: string }[], moduleId: string): string {
  return modules.find((m) => m.id === moduleId)?.nombre || moduleId;
}

export default AcademicHierarchyExplorer;
