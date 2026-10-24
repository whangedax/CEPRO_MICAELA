/**
 * pages/DashboardDocente.tsx
 * 
 * Dashboard Premium del Docente — CEPRO_MICAELA 2.0.
 * Conectado a la API y motor de Workspace de Node.js 24:
 * - Consulta GET /api/workspace/options (aulas y unidades autorizadas).
 * - Selección oficial de workspace mediante POST /api/workspace.
 * - Sincronización con GET /api/dashboard en tiempo real.
 * - Manejo de estados: Cargando, Sin aulas, Error de consulta, Espacio activo.
 * - Preservación rigurosa del diseño aprobado en Google Stitch.
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { pedagogicalActivities } from '../mocks/dashboard';
import StatusBadge from '../components/ui/StatusBadge/StatusBadge';
import ActivityCard from '../components/ui/ActivityCard/ActivityCard';
import ClassroomCard from '../components/ui/ClassroomCard/ClassroomCard';
import SelectUnitModal from '../components/academic/SelectUnitModal';
import { CalendarIcon } from '../components/ui/Icons';
import { NoticeModal } from '../components/ui/Modal/NoticeModal';
import { WorkspaceGroupOption } from '../api/types';

export const DashboardDocente: React.FC = () => {
  const { user } = useAuth();
  const {
    options,
    activeWorkspace,
    isLoading,
    error,
    loadOptions,
    selectGroupAndUnit,
  } = useWorkspace();

  // Modal demostrativo de actividades pedagógicas
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    originalRoute?: string;
    actionName?: string;
  }>({
    isOpen: false,
    title: '',
  });

  // Modal oficial de selección de Unidad Didáctica para ingresar al aula
  const [selectedGroupForModal, setSelectedGroupForModal] = useState<WorkspaceGroupOption | null>(null);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState<boolean>(false);

  const handleActivityClick = (title: string, route: string, actionText: string) => {
    setModalState({
      isOpen: true,
      title: `Actividad: ${title}`,
      originalRoute: route,
      actionName: actionText,
    });
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
            <span className="text-[12px] font-semibold text-slate-700">
              Panel del Docente
            </span>
          </div>
          <h1 className="text-[30px] text-[#172B28] font-bold tracking-tight leading-tight">
            {user ? `Buenos días, ${user.name}` : 'Buenos días, profesor'}
          </h1>
          <p className="text-[14px] text-slate-700 font-normal leading-relaxed">
            Organiza tus clases y actividades académicas de forma rápida y clara.
          </p>
        </div>

        {/* Period Card oficial */}
        <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
          <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)] text-slate-800">
            <div className="w-8 h-8 rounded-xl bg-[#e6f4f1] flex items-center justify-center text-[#13594A]">
              <CalendarIcon className="w-4 h-4 text-[#13594A]" />
            </div>
            <div className="flex flex-col pr-1">
              <span className="text-[10px] text-slate-600 uppercase tracking-widest font-bold leading-none">
                Periodo Activo
              </span>
              <span className="text-[13px] text-[#172B28] font-bold leading-tight">
                {activePeriod}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Banner de Contexto Académico Activo en Sesión (si el docente seleccionó un aula) */}
      {activeWorkspace && activeGroup && (
        <aside
          aria-label="Espacio académico activo"
          className="mb-8 p-4 rounded-2xl bg-[#e6f4f1] border border-[#13594A]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-slate-800 shadow-[0_2px_12px_rgba(19,89,74,0.06)] animate-in fade-in duration-300"
        >
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#13594A] text-white flex items-center justify-center font-bold text-[13px] shadow-sm shrink-0">
              {activeWorkspace.mode === 'UNIT' ? (activeWorkspace.unit || 'U.D.') : 'MOD'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#004034] uppercase tracking-wider">
                  Espacio de Trabajo Activo en Sesión
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              </div>
              <h2 className="text-[15px] font-bold text-[#172B28] leading-snug">
                {getProgramName(activeGroup.programId)} · {getModuleName(activeGroup.moduleId)}
              </h2>
              <p className="text-[12px] text-slate-700 font-medium">
                Aula: <span className="font-bold text-slate-900">{activeGroup.name}</span>
                {activeWorkspace.mode === 'UNIT' && activeWorkspace.unit ? (
                  <> · Unidad: <span className="font-bold text-[#13594A]">{activeWorkspace.unit}</span></>
                ) : (
                  <> · Módulo Completo</>
                )}
                {' · '}Turno: <span className="font-semibold text-slate-800">{activeGroup.turno || 'Mañana'}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleOpenUnitModal(activeGroup)}
            className="self-start sm:self-center px-4 py-2 rounded-xl bg-white border border-[#13594A]/30 text-[#13594A] text-[12px] font-bold hover:bg-[#13594A] hover:text-white transition-all shadow-xs shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13594A]"
          >
            Cambiar unidad
          </button>
        </aside>
      )}

      {/* 2. Sección de Actividades Pedagógicas (4 tarjetas oficiales de Stitch) */}
      <section className="mb-12" aria-labelledby="section-pedagogical-title">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 id="section-pedagogical-title" className="text-[16px] text-[#172B28] font-bold tracking-tight">
              Actividades pedagógicas
            </h2>
            <p className="text-[12px] text-slate-600 font-medium">
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
            <h2 id="section-classrooms-title" className="text-[20px] text-[#172B28] font-bold tracking-tight">
              Mis Aulas asignadas
            </h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#e6f4f1] text-[#004034] text-[11px] font-bold border border-[#13594A]/15">
              {options?.groups ? `${options.groups.length} aula(s) autorizadas por Dirección` : 'Consultando aulas...'}
            </span>
          </div>

          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
            DATOS DE PRUEBA · CONECTADO A SQLITE LOCAL
          </span>
        </div>

        {/* Estado 1: Cargando */}
        {isLoading && !options && (
          <div className="p-12 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-8 h-8 border-3 border-[#13594A]/20 border-t-[#13594A] rounded-full animate-spin" />
            <span className="text-[14px] font-semibold text-slate-700">
              Consultando aulas y asignaciones docentes en el servidor local...
            </span>
            <span className="text-[12px] text-slate-500">
              Verificando permisos y alcance de cuenta autorizada
            </span>
          </div>
        )}

        {/* Estado 2: Error de consulta */}
        {error && (
          <div
            role="alert"
            className="p-6 rounded-3xl bg-red-50 border border-red-200 text-red-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <h3 className="text-[14px] font-bold">Error de conexión con el servicio académico local</h3>
              <p className="text-[12px] text-red-700 mt-0.5">{error}</p>
            </div>
            <button
              type="button"
              onClick={loadOptions}
              className="px-4 py-2 rounded-xl bg-red-700 text-white text-[12px] font-semibold hover:bg-red-800 transition-colors self-start sm:self-auto shrink-0 shadow-xs"
            >
              Reintentar consulta
            </button>
          </div>
        )}

        {/* Estado 3: Sin aulas asignadas */}
        {!isLoading && options && options.groups.length === 0 && (
          <div className="p-12 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col items-center justify-center gap-2 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center mb-1">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <h3 className="text-[16px] font-bold text-slate-800">
              Sin aulas asignadas en el periodo actual
            </h3>
            <p className="text-[13px] text-slate-600 max-w-md">
              Actualmente su cuenta docente no registra grupos ni unidades didácticas asignadas.
              Comuníquese con Dirección Académica o Secretaría para verificar sus asignaciones oficiales.
            </p>
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
                />
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Footnote Académico Minimalista (WCAG 2.2 AA contrast) */}
      <footer className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-600 text-[11px]">
        <div className="inline-flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
          <span className="font-semibold text-slate-800">
            CETPRO Micaela Bastidas · Dirección Regional de Educación (DRE)
          </span>
          <span className="text-slate-400" aria-hidden="true">•</span>
          <span>
            Terminal activa de uso exclusivo para docentes · Base de datos sintética local
          </span>
        </div>
        <div className="inline-flex items-center gap-2 font-bold text-slate-700 uppercase tracking-wider text-[10px]">
          <span className="bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
            SISTEMA OFFLINE CONECTADO
          </span>
        </div>
      </footer>

      {/* Modal demostrativo de actividades pedagógicas */}
      <NoticeModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
        title={modalState.title}
        originalRoute={modalState.originalRoute}
        actionName={modalState.actionName}
      />

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
