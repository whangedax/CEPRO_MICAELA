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
import { DashboardPhotoBand } from '../components/ui/DashboardPhotoBand';
import { NavRoute } from '../types';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { pedagogicalActivities } from '../mocks/dashboard';
import StatusBadge from '../components/ui/StatusBadge/StatusBadge';
import ActivityCard from '../components/ui/ActivityCard/ActivityCard';
import ClassroomCard from '../components/ui/ClassroomCard/ClassroomCard';
import SelectUnitModal from '../components/academic/SelectUnitModal';
import ActiveUnitContextBanner from '../components/academic/ActiveUnitContextBanner';
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

  // Aula activa en sesión (si existe)
  const activeGroup = options?.groups.find((g) => g.id === activeWorkspace?.groupId);

  // Determinar periodo activo oficial
  const activePeriod =
    activeGroup?.periodId ||
    (options?.groups && options.groups.length > 0 ? options.groups[0].periodId : '2026-I');

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto min-w-0">
      {/* 1. Encabezado Superior */}
      <DashboardPhotoBand as="header" scene="docente" variant="hero" className="mb-8" contentClassName="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2 max-w-2xl min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <StatusBadge size="sm" />
            <span className="text-[var(--ui-muted)]" aria-hidden="true">•</span>
            <span className="text-[12px] leading-[18px] font-semibold text-[var(--ui-muted)]">
              Panel del Docente
            </span>
          </div>
          <h1 className="text-[30px] leading-[36px] text-[var(--ui-ink)] font-bold tracking-tight break-words">
            {user ? `Buenos días, ${user.name}` : 'Buenos días, profesor'}
          </h1>
          <p className="text-[14px] leading-[21px] text-[var(--ui-muted)] font-normal">
            Organiza tus clases, unidades didácticas y actividades académicas de forma rápida y clara.
          </p>
        </div>

        {/* Period Card oficial */}
        <div className="flex flex-wrap items-center gap-3 self-start lg:self-center shrink-0">
          <div className="inline-flex items-center gap-3 px-4 py-3 rounded-2xl bg-[var(--ui-surface)] border border-[var(--ui-line)] shadow-[var(--ui-shadow)] text-[var(--ui-ink)]">
            <div className="w-10 h-10 rounded-[10px] bg-[var(--ui-brand-soft)] flex items-center justify-center text-[var(--ui-brand)] shrink-0">
              <CalendarIcon className="w-5 h-5 text-[var(--ui-brand)]" />
            </div>
            <div className="flex flex-col pr-1">
              <span className="text-[12px] leading-[18px] text-[var(--ui-muted)] uppercase tracking-wider font-bold">
                Periodo Activo
              </span>
              <span className="text-[14px] leading-[21px] text-[var(--ui-ink)] font-bold tabular-nums">
                {activePeriod}
              </span>
            </div>
          </div>
        </div>
      </DashboardPhotoBand>

      {/* Banner de Contexto Académico Activo en Sesión */}
      <ActiveUnitContextBanner
        variant="full"
        showQuickModuleActions
        onNavigate={onNavigate}
        className="mb-8"
      />

      {/* 2. Sección de Actividades Pedagógicas */}
      <section className="mb-8" aria-labelledby="section-pedagogical-title">
        <DashboardPhotoBand scene="pedagogia" className="mb-4" contentClassName="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 id="section-pedagogical-title" className="text-[20px] leading-[28px] text-[var(--ui-ink)] font-bold tracking-tight">
              Actividades pedagógicas
            </h2>
            <p className="text-[14px] leading-[21px] text-[var(--ui-muted)] font-normal">
              Gestión curricular, asistencia, evaluación y documentación
            </p>
          </div>
        </DashboardPhotoBand>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
      <section className="space-y-4 mb-8" aria-labelledby="section-classrooms-title">
        <DashboardPhotoBand scene="aulas" contentClassName="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <h2 id="section-classrooms-title" className="text-[20px] leading-[28px] text-[var(--ui-ink)] font-bold tracking-tight">
              Mis Aulas asignadas
            </h2>
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--ui-brand-soft)] text-[var(--ui-brand)] text-[12px] leading-[18px] font-semibold tabular-nums border border-[var(--ui-line)]">
              {options?.groups ? `${options.groups.length} aula(s) autorizadas por Dirección` : 'Consultando aulas...'}
            </span>
          </div>

          <span className="text-[12px] leading-[18px] font-bold text-[var(--ui-muted)] uppercase tracking-wider bg-[var(--ui-surface-alt)] px-3 py-1 rounded-[10px] border border-[var(--ui-line)] shrink-0">
            {isInstitutional() ? 'SISTEMA ACADÉMICO INSTITUCIONAL · MODO OFFLINE' : 'SISTEMA ACADÉMICO · ENTORNO LOCAL'}
          </span>
        </DashboardPhotoBand>

        {/* Estado 1: Cargando */}
        {isLoading && !options && (
          <div
            role="status"
            className="p-6 rounded-2xl bg-[var(--ui-surface)] border border-[var(--ui-line)] shadow-[var(--ui-shadow)] flex flex-col items-center justify-center gap-3 text-center"
          >
            <div className="w-8 h-8 border-2 border-[var(--ui-line)] border-t-[var(--ui-brand)] rounded-full animate-spin" />
            <span className="text-[14px] leading-[21px] font-semibold text-[var(--ui-ink)]">
              Consultando aulas y asignaciones docentes en el servidor local...
            </span>
            <span className="text-[12px] leading-[18px] text-[var(--ui-muted)]">
              Verificando permisos y alcance de cuenta autorizada
            </span>
          </div>
        )}

        {/* Estado 2: Error de consulta */}
        {error && (
          <div
            role="alert"
            className="p-6 rounded-2xl bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-900/60 text-red-900 dark:text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3 min-w-0">
              <span
                aria-hidden="true"
                className="w-10 h-10 rounded-[10px] bg-red-100 dark:bg-rose-900/50 text-red-700 dark:text-rose-200 flex items-center justify-center font-bold text-[16px] shrink-0"
              >
                !
              </span>
              <div className="min-w-0">
                <h3 className="text-[16px] leading-[24px] font-bold">Error de conexión con el servicio académico local</h3>
                <p className="text-[14px] leading-[21px] text-red-700 dark:text-rose-300 mt-0.5 break-words">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadOptions}
              className="min-h-[44px] px-4 py-2.5 rounded-[10px] bg-red-700 text-white text-[14px] leading-[21px] font-semibold hover:bg-red-800 transition-colors self-start sm:self-auto shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              Reintentar consulta
            </button>
          </div>
        )}

        {/* Estado 3: Sin aulas asignadas */}
        {!isLoading && options && options.groups.length === 0 && (
          <div className="p-6 rounded-2xl bg-[var(--ui-surface)] border border-[var(--ui-line)] shadow-[var(--ui-shadow)] flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center mb-1">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <h3 className="text-[16px] leading-[24px] font-bold text-[var(--ui-ink)]">
              Sin aulas asignadas en el periodo actual
            </h3>
            <p className="text-[14px] leading-[21px] text-[var(--ui-muted)] max-w-md">
              Actualmente su cuenta docente no registra grupos ni unidades didácticas asignadas.
              Comuníquese con Dirección Académica o Secretaría para verificar sus asignaciones oficiales.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
              <button
                type="button"
                onClick={loadOptions}
                className="min-h-[44px] px-4 py-2.5 rounded-[10px] bg-[var(--ui-surface-alt)] border border-[var(--ui-line)] text-[var(--ui-ink)] hover:border-[var(--ui-brand)] hover:text-[var(--ui-brand)] text-[14px] leading-[21px] font-semibold transition-colors cursor-pointer"
              >
                Actualizar asignaciones
              </button>
              <button
                type="button"
                onClick={() => openSelector(1)}
                className="min-h-[44px] px-4 py-2.5 rounded-[10px] bg-[var(--ui-brand)] hover:opacity-90 text-[var(--ui-on-brand)] text-[14px] leading-[21px] font-semibold transition-colors cursor-pointer"
              >
                Abrir Asistente de Selección
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

      {/* 4. Footnote Académico Minimalista */}
      <footer className="pt-4 border-t border-[var(--ui-line)] flex flex-col sm:flex-row items-center justify-between gap-4 text-[var(--ui-muted)] text-[12px] leading-[18px]">
        <div className="inline-flex flex-wrap items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-[var(--ui-brand)] shrink-0" aria-hidden="true" />
          <span className="font-semibold text-[var(--ui-ink)]">
            CETPRO Micaela Bastidas · Dirección Regional de Educación (DRE)
          </span>
          <span className="text-[var(--ui-muted)]" aria-hidden="true">•</span>
          <span>
            {isInstitutional()
              ? 'Terminal activa de uso exclusivo para docentes · Base de datos institucional local'
              : 'Terminal activa de uso exclusivo para docentes · Base de datos sintética local'}
          </span>
        </div>
        <div className="inline-flex items-center gap-2 font-bold text-[var(--ui-ink)] uppercase tracking-wider text-[12px] leading-[18px] shrink-0">
          <span className="bg-[var(--ui-surface-alt)] px-3 py-1 rounded-[10px] border border-[var(--ui-line)]">
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
