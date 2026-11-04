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
      className={`bg-white dark:bg-[#182220] rounded-3xl p-6 border transition-all duration-300 flex flex-col justify-between ${
        isActiveWorkspace
          ? 'border-[#13594A] dark:border-[#205C4E] shadow-[0_8px_30px_rgba(19,89,74,0.12)] ring-1 ring-[#13594A]/30 dark:ring-[#205C4E]/40'
          : 'border-slate-100/90 dark:border-[#263834] shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_32px_rgba(19,89,74,0.08)] dark:hover:border-[#205C4E]'
      }`}
    >
      <div>
        {/* Header Aula */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl ${careerTheme.iconBgClass} text-white flex items-center justify-center shadow-md shrink-0`}
            >
              <CareerEmblemIcon
                programId={group.programId}
                programName={programName}
                className="w-6 h-6 text-white"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#13594A] dark:text-[#5EEAD4] tracking-wider uppercase font-bold">
                  Carrera Técnica
                </span>
                {isActiveWorkspace && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-[#132B25] text-emerald-900 dark:text-[#5EEAD4] text-[10px] font-bold border border-emerald-300 dark:border-[#205C4E]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-[#5EEAD4] animate-pulse" />
                    Aula Activa
                  </span>
                )}
              </div>
              <h3 className="text-[18px] text-[#172B28] dark:text-[#F0FDF8] font-bold tracking-tight leading-snug">
                {programName}
              </h3>
              <p className="text-[12px] text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                {moduleName}
              </p>
            </div>
          </div>

          {/* Shift Badge (WCAG 2.2 AA compliant contrast) */}
          {isMorning ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-300/80 dark:border-amber-800/60 text-[11px] font-semibold shrink-0">
              <SunIcon className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              {group.turno || 'Mañana'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800/60 text-[11px] font-semibold shrink-0">
              <SunsetIcon className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400" />
              {group.turno || 'Tarde'}
            </span>
          )}
        </div>

        {/* Ilustración Descriptiva de la Carrera */}
        <div className="mb-5">
          <CareerVisualBanner
            programId={group.programId}
            programName={programName}
            instanceId={group.id}
            heightClass="h-36"
            rightBadgeText={`Periodo ${group.periodId} · Sección ${group.section || 'A1'}`}
          />
        </div>

        {/* Academic Metadata Grid (contrast >= 4.5:1 on labels) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-5 p-3.5 rounded-2xl bg-slate-50 dark:bg-[#131C1A] border border-slate-200/80 dark:border-[#263834]">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wider font-bold">
              Grupo
            </span>
            <span className="text-[13px] text-slate-900 dark:text-slate-100 font-bold mt-0.5 truncate" title={groupLabel}>
              {groupLabel}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wider font-bold">
              Matriculados
            </span>
            <span className="text-[13px] text-[#13594A] dark:text-[#5EEAD4] font-bold mt-0.5 flex items-center gap-1.5">
              <StudentsIcon className="w-3.5 h-3.5 text-[#13594A] dark:text-[#5EEAD4]" />
              {group.studentCount} estudiantes
            </span>
          </div>
          <div className="flex flex-col col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wider font-bold mb-1">
              Unidades ({group.units.length} U.D.)
            </span>
            <div className="flex flex-wrap gap-1">
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
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer border ${
                      isUnitSelected
                        ? 'bg-[#13594A] text-white border-[#13594A] shadow-xs'
                        : 'bg-white dark:bg-[#182220] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-[#263834] hover:border-[#13594A] hover:text-[#13594A] dark:hover:text-[#5EEAD4]'
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
      <div className="pt-4 border-t border-slate-100 dark:border-[#263834] flex items-center justify-between">
        {isActiveWorkspace ? (
          <div className="text-[11px] font-semibold text-[#13594A] dark:text-[#5EEAD4] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Unidad: {activeUnitCode || 'Módulo completo'}</span>
          </div>
        ) : (
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Selección disponible
          </span>
        )}

        <button
          type="button"
          onClick={() => onEnterClassroom(group)}
          aria-label={`Ingresar al aula: ${programName}, ${groupLabel}`}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#13594A] text-white text-[12px] font-semibold shadow-sm hover:bg-[#004034] dark:hover:bg-[#1A6B5A] hover:shadow-[0_4px_12px_rgba(19,89,74,0.25)] transition-all duration-200 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13594A] dark:focus-visible:ring-[#5EEAD4] focus-visible:ring-offset-2"
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
