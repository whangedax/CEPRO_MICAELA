/**
 * components/ui/ClassroomCard/ClassroomCard.tsx
 * 
 * Tarjeta Académica Premium de Aula — CEPRO_MICAELA 2.0.
 * Conserva fielmente el diseño aprobado de Google Stitch e integra las
 * ilustraciones vectoriales descriptivas de las 7 carreras oficiales:
 * - Mecánica Automotriz, Mecánica de Motos, Carpintería Metálica,
 *   Peluquería y Barbería, Computación e Informática, Corte y Ensamblaje,
 *   y Mantenimiento de Sistemas Eléctricos.
 * - Badges de turno con contraste accesible WCAG 2.2 AA.
 * - Grilla de metadatos académicos oficiales (Grupo, Matriculados, Unidades).
 * - Conexión al mecanismo oficial de selección de workspace.
 */

import React from 'react';
import { WorkspaceGroupOption } from '../../../api/types';
import {
  SunIcon,
  SunsetIcon,
  StudentsIcon,
  ArrowForwardIcon,
} from '../Icons';
import {
  CareerVisualBanner,
  CareerEmblemIcon,
  resolveCareerVisualTheme,
} from '../../academic/CareerVisualBanner';

export interface ClassroomCardProps {
  group: WorkspaceGroupOption;
  programName: string;
  moduleName: string;
  isActiveWorkspace?: boolean;
  activeUnitCode?: string;
  onEnterClassroom: (group: WorkspaceGroupOption) => void;
  onSelectUnit?: (group: WorkspaceGroupOption, unitCode: string) => void;
}

export const ClassroomCard: React.FC<ClassroomCardProps> = ({
  group,
  programName,
  moduleName,
  isActiveWorkspace = false,
  activeUnitCode,
  onEnterClassroom,
  onSelectUnit,
}) => {
  const careerTheme = resolveCareerVisualTheme(group.programId, programName);

  // Determinar turno y estilo de badge
  const turno = (group.turno || '').trim().toLowerCase();
  const isMorning = turno.includes('mañana') || turno.includes('manana') || turno.includes('matutino');

  // Extraer nombre abreviado del grupo
  const groupLabel = group.name.includes('·')
    ? group.name.split('·').slice(1).join('·').trim() || group.name
    : group.name;

  return (
    <div
      className={`min-w-0 bg-[var(--ui-surface)] rounded-2xl p-6 border transition-all duration-200 flex flex-col justify-between shadow-[var(--ui-shadow)] ${
        isActiveWorkspace
          ? 'border-[var(--ui-brand)] ring-1 ring-[var(--ui-brand)]/30'
          : 'border-[var(--ui-line)] hover:border-[var(--ui-brand)]/60'
      }`}
    >
      <div className="min-w-0">
        {/* Header Aula */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-4 min-w-0">
            <div
              className={`w-12 h-12 rounded-2xl ${careerTheme.iconBgClass} text-white flex items-center justify-center shadow-sm shrink-0`}
            >
              <CareerEmblemIcon
                programId={group.programId}
                programName={programName}
                className="w-6 h-6 text-white"
              />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {isActiveWorkspace && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--ui-brand-soft)] text-[var(--ui-brand)] text-[12px] leading-[18px] font-bold border border-[var(--ui-line)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--ui-brand)] animate-pulse" />
                    Aula Activa
                  </span>
                )}
              </div>
              <h3 className="text-lg leading-snug text-ink font-bold break-words">
                {programName}
              </h3>
              <p className="text-sm leading-relaxed text-muted mt-1 break-words">
                {moduleName}
              </p>
            </div>
          </div>

          {/* Shift Badge (WCAG 2.2 AA compliant contrast) */}
          {isMorning ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-300/80 dark:border-amber-800/60 text-[12px] leading-[18px] font-semibold shrink-0">
              <SunIcon className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              {group.turno || 'Mañana'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800/60 text-[12px] leading-[18px] font-semibold shrink-0">
              <SunsetIcon className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400" />
              {group.turno || 'Tarde'}
            </span>
          )}
        </div>

        {/* Ilustración Descriptiva de la Carrera */}
        <div className="mb-4">
          <CareerVisualBanner
            programId={group.programId}
            programName={programName}
            instanceId={group.id}
            heightClass="h-36"
            showToolsFooter={false}
            rightBadgeText={`Periodo ${group.periodId} · Sección ${group.section || 'A1'}`}
          />
        </div>

        {/* Academic Metadata Grid (contrast >= 4.5:1 on labels) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 p-4 rounded-2xl bg-[var(--ui-surface-alt)] border border-[var(--ui-line)]">
          <div className="flex flex-col min-w-0">
            <span className="text-[12px] leading-[18px] text-[var(--ui-muted)] uppercase tracking-wider font-bold">
              Grupo
            </span>
            <span className="text-sm leading-relaxed text-ink font-bold mt-0.5 break-words" title={groupLabel}>
              {groupLabel}
            </span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[12px] leading-[18px] text-[var(--ui-muted)] uppercase tracking-wider font-bold">
              Matriculados
            </span>
            <span className="text-[14px] leading-[21px] text-[var(--ui-brand)] font-bold tabular-nums mt-0.5 flex items-center gap-1.5">
              <StudentsIcon className="w-3.5 h-3.5 text-[var(--ui-brand)] shrink-0" />
              <span>{group.studentCount} estudiantes</span>
            </span>
          </div>
          <div className="flex flex-col col-span-2 sm:col-span-1 min-w-0">
            <span className="text-[12px] leading-[18px] text-[var(--ui-muted)] uppercase tracking-wider font-bold tabular-nums mb-1.5">
              Unidades ({group.units.length} U.D.)
            </span>
            <div className="flex flex-wrap gap-2">
              {group.units.map((u) => {
                const isUnitSelected = isActiveWorkspace && activeUnitCode === u.code;
                return (
                  <button
                    key={u.code}
                    type="button"
                    onClick={() => {
                      if (onSelectUnit) {
                        onSelectUnit(group, u.code);
                      } else {
                        onEnterClassroom(group);
                      }
                    }}
                    title={u.name ? `Seleccionar ${u.code}: ${u.name}` : `Seleccionar unidad ${u.code}`}
                    className={`min-h-[44px] px-3 py-2 rounded-[10px] text-[12px] leading-[18px] font-bold transition-colors cursor-pointer border ${
                      isUnitSelected
                        ? 'bg-[var(--ui-brand)] text-[var(--ui-on-brand)] border-[var(--ui-brand)]'
                        : 'bg-[var(--ui-surface)] text-[var(--ui-ink)] border-[var(--ui-line)] hover:border-[var(--ui-brand)] hover:text-[var(--ui-brand)]'
                    }`}
                  >
                    {u.code}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Card Footer: Action with accessible label and focus */}
      <div className="pt-4 border-t border-[var(--ui-line)] flex flex-wrap items-center justify-between gap-3">
        {isActiveWorkspace ? (
          <div className="text-[12px] leading-[18px] font-semibold text-[var(--ui-brand)] flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-[var(--ui-brand)] shrink-0" />
            <span className="truncate">Unidad: {activeUnitCode || 'Módulo completo'}</span>
          </div>
        ) : (
          <span className="text-[12px] leading-[18px] text-[var(--ui-muted)] font-medium">
            Selección disponible
          </span>
        )}

        <button
          type="button"
          onClick={() => onEnterClassroom(group)}
          aria-label={`Ingresar al aula: ${programName}, ${groupLabel}`}
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-[10px] bg-[var(--ui-brand)] text-[var(--ui-on-brand)] text-[14px] leading-[21px] font-semibold hover:opacity-90 transition-all duration-200 group cursor-pointer shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-brand)] focus-visible:ring-offset-2"
        >
          <span>{isActiveWorkspace ? 'Cambiar unidad' : 'Ingresar al aula'}</span>
          <span className="transition-transform group-hover:translate-x-1">
            <ArrowForwardIcon className="w-3.5 h-3.5" />
          </span>
        </button>
      </div>
    </div>
  );
};

export default ClassroomCard;
