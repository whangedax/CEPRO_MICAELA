/**
 * pages/DashboardDocente.tsx
 * 
 * Dashboard Premium del Docente — CEPRO_MICAELA 2.0.
 * Conectado a la API y motor de Workspace de Node.js 24:
 * - Consulta GET /api/workspace/options (aulas y unidades autorizadas).
 * - Selección oficial de workspace mediante POST /api/workspace.
 * - Explorador Jerárquico por Carrera, Módulo y Unidades Didácticas con imágenes descriptivas.
 * - Navegación directa funcional en todas las actividades pedagógicas.
 */

import React, { useState } from 'react';
import { NavRoute } from '../types';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { pedagogicalActivities } from '../mocks/dashboard';
import StatusBadge from '../components/ui/StatusBadge/StatusBadge';
import ActivityCard from '../components/ui/ActivityCard/ActivityCard';
import ClassroomCard from '../components/ui/ClassroomCard/ClassroomCard';
import SelectUnitModal from '../components/academic/SelectUnitModal';
import { CalendarIcon } from '../components/ui/Icons';
import { WorkspaceGroupOption } from '../api/types';
import { isInstitutional } from '../utils/appProfile';

export interface DashboardDocenteProps {
  onNavigate?: (route: NavRoute) => void;
}

export const DashboardDocente: React.FC<DashboardDocenteProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const {
    options,
    activeWorkspace,
    isLoading,
    error,
    loadOptions,
    selectGroupAndUnit,
    openSelector,
  } = useWorkspace();

  // Modal oficial de selección de Unidad Didáctica para ingresar al aula
  const [selectedGroupForModal, setSelectedGroupForModal] = useState<WorkspaceGroupOption | null>(null);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState<boolean>(false);

  const handleActivityClick = (_title: string, route: string, _actionText: string) => {
    if (!route) return;
    const cleanRoute = route.replace(/^#\/?/, '').trim() as NavRoute;
    if (onNavigate) {
      onNavigate(cleanRoute);
    } else {
      window.location.hash = route.startsWith('#') ? route : `#/${route}`;
    }
  };

  const handleOpenUnitModal = (group: WorkspaceGroupOption) => {
    setSelectedGroupForModal(group);
    setIsUnitModalOpen(true);
  };

  const handleConfirmUnitSelection = async (
    group: WorkspaceGroupOption,
    mode: 'UNIT' | 'MODULE',
    unitCode?: string
  ) => {
    await selectGroupAndUnit(group, mode, unitCode);
  };

  // Helper para resolver nombres de programas y módulos desde las opciones del backend
  const getProgramName = (programId: string) => {
    return options?.programs.find((p) => p.id === programId)?.nombre || programId;
  };

  const getModuleName = (moduleId: string) => {
    return options?.modules.find((m) => m.id === moduleId)?.nombre || moduleId;
  };

  // Determinar periodo activo oficial
  const activePeriod =
    activeWorkspace?.year ||
    (options?.groups && options.groups.length > 0 ? options.groups[0].periodId : '2026-I');

  // Aula activa en sesión (si existe)
  const activeGroup = options?.groups.find((g) => g.id === activeWorkspace?.groupId);

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto">
      {/* 1. Encabezado Superior */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div className="flex flex-col gap-1.5 max-w-2xl">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge size="sm" />
            <span className="text-slate-400" aria-hidden="true">•</span>
            <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">
              Panel del Docente
            </span>
          </div>
          <h1 className="text-[30px] text-[#172B28] dark:text-[#F0FDF8] font-bold tracking-tight leading-tight">
            {user ? `Buenos días, ${user.name}` : 'Buenos días, profesor'}
          </h1>
          <p className="text-[14px] text-slate-700 dark:text-slate-300 font-normal leading-relaxed">
            Organiza tus clases, unidades didácticas y actividades académicas de forma rápida y clara.
          </p>
        </div>

        {/* Period Card oficial */}
        <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
          <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white dark:bg-[#182220] border border-slate-200/80 dark:border-[#263834] shadow-[0_2px_8px_rgba(0,0,0,0.03)] text-slate-800 dark:text-slate-200">
            <div className="w-8 h-8 rounded-xl bg-[#e6f4f1] dark:bg-[#132B25] flex items-center justify-center text-[#13594A] dark:text-[#5EEAD4]">
              <CalendarIcon className="w-4 h-4 text-[#13594A] dark:text-[#5EEAD4]" />
            </div>
            <div className="flex flex-col pr-1">
              <span className="text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-widest font-bold leading-none">
                Periodo Activo
              </span>
              <span className="text-[13px] text-[#172B28] dark:text-[#F0FDF8] font-bold leading-tight">
                {activePeriod}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Banner de Contexto Académico Activo en Sesión */}
      {activeWorkspace && activeGroup ? (
        <aside
          aria-label="Espacio académico activo"
          className="mb-8 p-4 rounded-2xl bg-[#e6f4f1] dark:bg-[#182220] border border-[#13594A]/25 dark:border-[#263834] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-slate-800 dark:text-slate-200 shadow-[0_2px_12px_rgba(19,89,74,0.06)] animate-in fade-in duration-300"
        >
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#13594A] dark:bg-[#132B25] dark:border dark:border-[#205C4E] text-white dark:text-[#5EEAD4] flex items-center justify-center font-bold text-[13px] shadow-sm shrink-0">
              {activeWorkspace.mode === 'UNIT' ? (activeWorkspace.unit || 'U.D.') : 'MOD'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#004034] dark:text-[#5EEAD4] uppercase tracking-wider">
                  Espacio de Trabajo Activo en Sesión
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-[#5EEAD4] animate-pulse" />
              </div>
              <h2 className="text-[15px] font-bold text-[#172B28] dark:text-[#F0FDF8] leading-snug">
                {getProgramName(activeGroup.programId)} · {getModuleName(activeGroup.moduleId)}
              </h2>
              <p className="text-[12px] text-slate-700 dark:text-slate-300 font-medium">
                Aula: <span className="font-bold text-slate-900 dark:text-slate-100">{activeGroup.name}</span>
                {activeWorkspace.mode === 'UNIT' && activeWorkspace.unit ? (
                  <> · Unidad: <span className="font-bold text-[#13594A] dark:text-[#5EEAD4]">{activeWorkspace.unit}</span></>
                ) : (
                  <> · Módulo Completo</>
                )}
                {' · '}Turno: <span className="font-semibold text-slate-800 dark:text-slate-200">{activeGroup.turno || 'Mañana'}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(activeGroup.units || []).map((u) => {
              const isCurrentUnit =
                (activeWorkspace.mode === 'UNIT' && activeWorkspace.unit === u.code) ||
                (activeWorkspace.mode === 'PRACTICE' && u.code === 'EFSRT');
              return (
                <button
                  key={u.code}
                  type="button"
                  onClick={() => selectGroupAndUnit(activeGroup, u.code === 'EFSRT' ? 'PRACTICE' : 'UNIT', u.code)}
                  title={u.name ? `${u.code}: ${u.name}` : `Activar ${u.code}`}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                    isCurrentUnit
                      ? 'bg-[#13594A] text-white border-[#13594A] shadow-xs'
                      : 'bg-white dark:bg-[#131C1A] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#263834] hover:border-[#13594A] hover:text-[#13594A] dark:hover:text-[#5EEAD4]'
                  }`}
                >
                  {u.code}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => openSelector(1)}
              className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#131C1A] border border-[#13594A]/30 dark:border-[#205C4E] text-[#13594A] dark:text-[#5EEAD4] text-[12px] font-bold hover:bg-[#13594A] hover:text-white dark:hover:bg-[#1A6B5A] transition-all shadow-xs shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13594A] dark:focus-visible:ring-[#5EEAD4]"
            >
              🔄 Cambiar aula
            </button>
          </div>
        </aside>
      ) : (
        <aside
          aria-label="Selección de espacio docente"
          className="mb-8 p-5 rounded-2xl bg-[#E6F4F1] dark:bg-[#132B25] border border-[#13594A]/25 dark:border-[#205C4E] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#13594A] text-white flex items-center justify-center font-bold text-[14px] shadow-sm shrink-0">
              🎯
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-[#172B28] dark:text-[#F0FDF8] leading-snug">
                Seleccione su Aula y Unidad Didáctica de Trabajo
              </h2>
              <p className="text-[12px] text-slate-700 dark:text-slate-300 font-medium">
                Abra el asistente por pasos para seleccionar la carrera, módulo, aula y unidad que va a calificar o tomar asistencia.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openSelector(1)}
            className="self-start sm:self-center px-4 py-2.5 rounded-xl bg-[#13594A] hover:bg-[#004034] text-white text-[12px] font-bold shadow-xs shrink-0 cursor-pointer transition-colors"
          >
            Seleccionar Unidad →
          </button>
        </aside>
      )}

      {/* 2. Sección de Actividades Pedagógicas (4 tarjetas oficiales de Stitch) */}
      <section className="mb-12" aria-labelledby="section-pedagogical-title">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 id="section-pedagogical-title" className="text-[16px] text-[#172B28] dark:text-[#F0FDF8] font-bold tracking-tight">
              Actividades pedagógicas
            </h2>
            <p className="text-[12px] text-slate-600 dark:text-slate-400 font-medium">
              Gestión curricular, asistencia, evaluación y documentación
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {pedagogicalActivities.map((card) => (
            <ActivityCard
              key={card.id}
              {...card}
              onActionClick={handleActivityClick}
            />
          ))}
        </div>
      </section>

      {/* 3. Sección "Mis Aulas asignadas" (Conectada a la API real de Node.js 24 / SQLite) */}
      <section className="space-y-4 mb-10" aria-labelledby="section-classrooms-title">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 id="section-classrooms-title" className="text-[20px] text-[#172B28] dark:text-[#F0FDF8] font-bold tracking-tight">
              Mis Aulas asignadas
            </h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#e6f4f1] dark:bg-[#132B25] text-[#004034] dark:text-[#5EEAD4] text-[11px] font-bold border border-[#13594A]/15 dark:border-[#205C4E]">
              {options?.groups ? `${options.groups.length} aula(s) autorizadas por Dirección` : 'Consultando aulas...'}
            </span>
          </div>

          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-[#182220] px-2.5 py-1 rounded-md border border-slate-200 dark:border-[#263834]">
            {isInstitutional() ? 'SISTEMA ACADÉMICO INSTITUCIONAL · MODO OFFLINE' : 'SISTEMA ACADÉMICO · ENTORNO LOCAL'}
          </span>
        </div>

        {/* Estado 1: Cargando */}
        {isLoading && !options && (
          <div className="p-12 rounded-3xl bg-white dark:bg-[#182220] border border-slate-200/80 dark:border-[#263834] shadow-xs flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-8 h-8 border-3 border-[#13594A]/20 border-t-[#13594A] dark:border-t-[#5EEAD4] rounded-full animate-spin" />
            <span className="text-[14px] font-semibold text-slate-700 dark:text-slate-300">
              Consultando aulas y asignaciones docentes en el servidor local...
            </span>
            <span className="text-[12px] text-slate-500 dark:text-slate-400">
              Verificando permisos y alcance de cuenta autorizada
            </span>
          </div>
        )}

        {/* Estado 2: Error de consulta */}
        {error && (
          <div
            role="alert"
            className="p-6 rounded-3xl bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-900/60 text-red-900 dark:text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <h3 className="text-[14px] font-bold">Error de conexión con el servicio académico local</h3>
              <p className="text-[12px] text-red-700 dark:text-rose-300 mt-0.5">{error}</p>
            </div>
            <button
              type="button"
              onClick={loadOptions}
              className="px-4 py-2 rounded-xl bg-red-700 text-white text-[12px] font-semibold hover:bg-red-800 transition-colors self-start sm:self-auto shrink-0 shadow-xs cursor-pointer"
            >
              Reintentar consulta
            </button>
          </div>
        )}

        {/* Estado 3: Sin aulas asignadas */}
        {!isLoading && options && options.groups.length === 0 && (
          <div className="p-12 rounded-3xl bg-white dark:bg-[#182220] border border-slate-200/80 dark:border-[#263834] shadow-xs flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center mb-1">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <h3 className="text-[16px] font-bold text-slate-800 dark:text-slate-200">
              Sin aulas asignadas en el periodo actual
            </h3>
            <p className="text-[13px] text-slate-600 dark:text-slate-400 max-w-md">
              Actualmente su cuenta docente no registra grupos ni unidades didácticas asignadas.
              Comuníquese con Dirección Académica o Secretaría para verificar sus asignaciones oficiales.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
              <button
                type="button"
                onClick={loadOptions}
                className="px-4 py-2 rounded-xl bg-white dark:bg-[#131C1A] border border-slate-200 dark:border-[#263834] text-slate-700 dark:text-slate-300 hover:text-[#13594A] dark:hover:text-[#5EEAD4] text-xs font-bold transition-colors cursor-pointer"
              >
                🔄 Actualizar asignaciones
              </button>
              <button
                type="button"
                onClick={() => openSelector(1)}
                className="px-4 py-2 rounded-xl bg-[#13594A] hover:bg-[#004034] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                🎯 Abrir Asistente de Selección
              </button>
            </div>
          </div>
        )}

        {/* Estado 4: Aulas asignadas reales */}
        {options && options.groups.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {options.groups.map((group) => {
              const programName = getProgramName(group.programId);
              const moduleName = getModuleName(group.moduleId);
              const isActive = activeWorkspace?.groupId === group.id;

              return (
                <ClassroomCard
                  key={group.id}
                  group={group}
                  programName={programName}
                  moduleName={moduleName}
                  isActiveWorkspace={isActive}
                  activeUnitCode={isActive ? activeWorkspace?.unit : undefined}
                  onEnterClassroom={handleOpenUnitModal}
                  onSelectUnit={async (grp, unitCode) => {
                    await selectGroupAndUnit(grp, unitCode === 'EFSRT' ? 'PRACTICE' : 'UNIT', unitCode);
                  }}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Footnote Académico Minimalista (WCAG 2.2 AA contrast) */}
      <footer className="pt-4 border-t border-slate-200 dark:border-[#263834] flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-600 dark:text-slate-400 text-[11px]">
        <div className="inline-flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            CETPRO Micaela Bastidas · Dirección Regional de Educación (DRE)
          </span>
          <span className="text-slate-400" aria-hidden="true">•</span>
          <span>
            {isInstitutional()
              ? 'Terminal activa de uso exclusivo para docentes · Base de datos institucional local'
              : 'Terminal activa de uso exclusivo para docentes · Base de datos sintética local'}
          </span>
        </div>
        <div className="inline-flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
          <span className="bg-slate-100 dark:bg-[#182220] px-2.5 py-0.5 rounded border border-slate-200 dark:border-[#263834]">
            SISTEMA OFFLINE CONECTADO
          </span>
        </div>
      </footer>

      {/* Modal oficial de selección de Unidad Didáctica para ingresar al aula */}
      <SelectUnitModal
        isOpen={isUnitModalOpen}
        group={selectedGroupForModal}
        programName={selectedGroupForModal ? getProgramName(selectedGroupForModal.programId) : ''}
        moduleName={selectedGroupForModal ? getModuleName(selectedGroupForModal.moduleId) : ''}
        currentUnitCode={
          activeWorkspace?.groupId === selectedGroupForModal?.id ? activeWorkspace?.unit : undefined
        }
        onClose={() => setIsUnitModalOpen(false)}
        onConfirm={handleConfirmUnitSelection}
      />
    </div>
  );
};

export default DashboardDocente;
