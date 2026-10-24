/**
 * components/ui/ClassroomCard/ClassroomCard.tsx
 * 
 * Tarjeta Académica Premium de Aula — CEPRO_MICAELA 2.0.
 * Conserva fielmente el diseño aprobado de Google Stitch:
 * - Iconografía vectorial y gradientes temáticos (Tecnológico / Artesanal).
 * - Badges de turno con contraste accesible WCAG 2.2 AA.
 * - Grilla de metadatos académicos oficiales (Grupo, Matriculados, Unidades).
 * - Conexión al mecanismo oficial de selección de workspace.
 */

import React from 'react';
import { WorkspaceGroupOption } from '../../../api/types';
import {
  TerminalIcon,
  StylerIcon,
  SunIcon,
  SunsetIcon,
  LaptopIcon,
  CodeIcon,
  DataObjectIcon,
  DeveloperBoardIcon,
  ScissorsIcon,
  CheckroomIcon,
  StraightenIcon,
  DesignServicesIcon,
  StudentsIcon,
  ArrowForwardIcon,
} from '../Icons';

export interface ClassroomCardProps {
  group: WorkspaceGroupOption;
  programName: string;
  moduleName: string;
  isActiveWorkspace?: boolean;
  activeUnitCode?: string;
  onEnterClassroom: (group: WorkspaceGroupOption) => void;
}

export const ClassroomCard: React.FC<ClassroomCardProps> = ({
  group,
  programName,
  moduleName,
  isActiveWorkspace = false,
  activeUnitCode,
  onEnterClassroom,
}) => {
  // Detección de especialidad técnica para selección de gráficos vectoriales
  const normalizedProg = (programName || '').toUpperCase();
  const isTech =
    normalizedProg.includes('COMPUTAC') ||
    normalizedProg.includes('INFORMÁT') ||
    normalizedProg.includes('INFORMAT') ||
    normalizedProg.includes('SISTEMA') ||
    normalizedProg.includes('ELECTR');

  // Determinar turno y estilo de badge
  const turno = (group.turno || '').trim().toLowerCase();
  const isMorning = turno.includes('mañana') || turno.includes('manana') || turno.includes('matutino');

  // Extraer nombre abreviado del grupo
  const groupLabel = group.name.includes('·')
    ? group.name.split('·')[1]?.trim() || group.name
    : group.name;

  return (
    <div
      className={`bg-white rounded-3xl p-6 border transition-all duration-300 flex flex-col justify-between ${
        isActiveWorkspace
          ? 'border-[#13594A] shadow-[0_8px_30px_rgba(19,89,74,0.12)] ring-1 ring-[#13594A]/30'
          : 'border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_32px_rgba(19,89,74,0.08)]'
      }`}
    >
      <div>
        {/* Header Aula */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl ${
                isTech ? 'bg-[#004034] shadow-[#004034]/20' : 'bg-[#3e665b] shadow-[#3e665b]/20'
              } text-white flex items-center justify-center shadow-md shrink-0`}
            >
              {isTech ? (
                <TerminalIcon className="w-6 h-6 text-white" />
              ) : (
                <StylerIcon className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#13594A] tracking-wider uppercase font-bold">
                  Carrera Técnica
                </span>
                {isActiveWorkspace && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold border border-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    Aula Activa
                  </span>
                )}
              </div>
              <h3 className="text-[18px] text-[#172B28] font-bold tracking-tight leading-snug">
                {programName}
              </h3>
              <p className="text-[12px] text-slate-600 font-medium mt-0.5">
                {moduleName}
              </p>
            </div>
          </div>

          {/* Shift Badge (WCAG 2.2 AA compliant contrast) */}
          {isMorning ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-300/80 text-[11px] font-semibold shrink-0">
              <SunIcon className="w-3.5 h-3.5 text-amber-700" />
              {group.turno || 'Mañana'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-900 border border-indigo-200 text-[11px] font-semibold shrink-0">
              <SunsetIcon className="w-3.5 h-3.5 text-indigo-700" />
              {group.turno || 'Tarde'}
            </span>
          )}
        </div>

        {/* Visual Academic Vector Banner */}
        <div
          className={`relative w-full h-36 rounded-2xl overflow-hidden mb-5 ${
            isTech
              ? 'bg-gradient-to-br from-[#0c2e27] via-[#13594A] to-[#1c6e5d]'
              : 'bg-gradient-to-br from-[#1c2c3e] via-[#2d4d5e] to-[#3e665b]'
          } group flex flex-col justify-between p-4 shadow-inner`}
        >
          {/* Subtle vector grid overlay pattern */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            {isTech ? (
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <defs>
                  <pattern id={`tech-grid-${group.id}`} width="20" height="20" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1" fill="#ffffff" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill={`url(#tech-grid-${group.id})`} />
              </svg>
            ) : (
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <defs>
                  <pattern
                    id={`textile-pattern-${group.id}`}
                    width="16"
                    height="16"
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(45)"
                  >
                    <line x1="0" y1="0" x2="16" y2="0" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="3,3" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill={`url(#textile-pattern-${group.id})`} />
              </svg>
            )}
          </div>

          {/* Top row of banner icons */}
          <div className="relative flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              {isTech ? (
                <>
                  <span className="w-7 h-7 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-teal-200">
                    <LaptopIcon className="w-4 h-4" />
                  </span>
                  <span className="w-7 h-7 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-teal-200">
                    <CodeIcon className="w-4 h-4" />
                  </span>
                  <span className="w-7 h-7 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-teal-200">
                    <DataObjectIcon className="w-4 h-4" />
                  </span>
                </>
              ) : (
                <>
                  <span className="w-7 h-7 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-teal-200">
                    <ScissorsIcon className="w-4 h-4" />
                  </span>
                  <span className="w-7 h-7 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-teal-200">
                    <CheckroomIcon className="w-4 h-4" />
                  </span>
                  <span className="w-7 h-7 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-teal-200">
                    <StraightenIcon className="w-4 h-4" />
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Bottom row of banner */}
          <div className="relative z-10 flex items-end justify-between">
            <div>
              <div className="text-[11px] font-bold text-teal-200 uppercase tracking-widest leading-none mb-1">
                Entorno Académico
              </div>
              <div className="text-[14px] font-bold text-white flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isTech ? 'bg-emerald-400' : 'bg-indigo-300'
                  }`}
                  aria-hidden="true"
                />
                <span>Periodo {group.periodId} · {group.modalidad || 'Presencial'}</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-teal-200 group-hover:scale-110 transition-transform">
              {isTech ? (
                <DeveloperBoardIcon className="w-7 h-7" />
              ) : (
                <DesignServicesIcon className="w-7 h-7" />
              )}
            </div>
          </div>
        </div>

        {/* Academic Metadata Grid (contrast >= 4.5:1 on labels) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-600 uppercase tracking-wider font-bold">
              Grupo
            </span>
            <span className="text-[13px] text-slate-900 font-bold mt-0.5 truncate" title={groupLabel}>
              {groupLabel}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-600 uppercase tracking-wider font-bold">
              Matriculados
            </span>
            <span className="text-[13px] text-[#13594A] font-bold mt-0.5 flex items-center gap-1.5">
              <StudentsIcon className="w-3.5 h-3.5 text-[#13594A]" />
              {group.studentCount} estudiantes
            </span>
          </div>
          <div className="flex flex-col col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-600 uppercase tracking-wider font-bold">
              Unidades Didácticas
            </span>
            <span className="text-[12px] text-slate-800 font-bold mt-0.5">
              {group.units.length} U.D. ({group.units.map(u => u.code).join(', ')})
            </span>
          </div>
        </div>
      </div>

      {/* Card Footer: Action with accessible label and focus */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
        {isActiveWorkspace ? (
          <div className="text-[11px] font-semibold text-[#13594A] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Unidad: {activeUnitCode || 'Módulo completo'}</span>
          </div>
        ) : (
          <span className="text-[11px] text-slate-500 font-medium">
            Selección disponible
          </span>
        )}

        <button
          type="button"
          onClick={() => onEnterClassroom(group)}
          aria-label={`Ingresar al aula: ${programName}, ${groupLabel}`}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#13594A] text-white text-[12px] font-semibold shadow-sm hover:bg-[#004034] hover:shadow-[0_4px_12px_rgba(19,89,74,0.25)] transition-all duration-200 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13594A] focus-visible:ring-offset-2"
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
