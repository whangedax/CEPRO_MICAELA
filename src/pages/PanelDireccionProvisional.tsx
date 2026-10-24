/**
 * PanelDireccionProvisional.tsx
 * 
 * Pantalla provisional institucional para el rol DIRECTOR en CEPRO_MICAELA 2.0.
 * Reemplaza el Dashboard Docente con la vista institucional autorizada de Dirección.
 * Mantiene la línea visual premium de Google Stitch (#13594A, #F6F8FA).
 */

import React from 'react';
import { NavRoute } from '../types';
import StatusBadge from '../components/ui/StatusBadge/StatusBadge';
import {
  AcademicConfigIcon,
  AccountsIcon,
  BackupIcon,
  DocumentIcon,
  EnrollmentIcon,
  StudentsIcon,
  ArrowForwardIcon,
  InstitutionalBrandIcon,
} from '../components/ui/Icons';

interface PanelDireccionProvisionalProps {
  onNavigate: (route: NavRoute) => void;
}

export const PanelDireccionProvisional: React.FC<PanelDireccionProvisionalProps> = ({
  onNavigate,
}) => {
  const administrativeActions = [
    {
      route: 'configuracion-academica' as NavRoute,
      title: 'Configuración por año',
      description: 'Gestión de carreras, planes de estudio, módulos y turnos lectivos vigentes.',
      icon: <AcademicConfigIcon className="w-5 h-5 text-[#13594A]" />,
      badge: 'Gestión anual',
    },
    {
      route: 'cuentas' as NavRoute,
      title: 'Usuarios y asignaciones',
      description: 'Creación de cuentas de docentes, secretaría y vinculación con aulas asignadas.',
      icon: <AccountsIcon className="w-5 h-5 text-[#13594A]" />,
      badge: 'Personal',
    },
    {
      route: 'respaldo' as NavRoute,
      title: 'Respaldo y migración',
      description: 'Copias de seguridad fuera de línea, exportación cifrada y migración institucional.',
      icon: <BackupIcon className="w-5 h-5 text-[#13594A]" />,
      badge: 'Seguridad',
    },
    {
      route: 'matriculas' as NavRoute,
      title: 'Supervisión de matrículas',
      description: 'Auditoría del padrón de participantes inscritos y verificación de módulos.',
      icon: <EnrollmentIcon className="w-5 h-5 text-[#13594A]" />,
      badge: 'Matrícula',
    },
    {
      route: 'estudiantes' as NavRoute,
      title: 'Padrón de estudiantes',
      description: 'Consulta consolidada de estudiantes, legajos académicos y estado de egresados.',
      icon: <StudentsIcon className="w-5 h-5 text-[#13594A]" />,
      badge: 'Participantes',
    },
    {
      route: 'documentos' as NavRoute,
      title: 'Emisión de documentos oficiales',
      description: 'Supervisión y emisión de actas consolidadas, certificados y nóminas.',
      icon: <DocumentIcon className="w-5 h-5 text-[#13594A]" />,
      badge: 'Documentación',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header institucional */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-bold text-[#004034] uppercase tracking-widest bg-[#E6F4F1] px-2.5 py-1 rounded-md">
              Ámbito Institucional · Dirección
            </span>
            <StatusBadge size="sm" />
          </div>
          <h1 className="text-3xl font-extrabold text-[#0D382F] tracking-tight">
            Panel de Dirección
            <span className="block text-2xl font-semibold text-slate-600 mt-1">
              pendiente de modernización
            </span>
          </h1>
          <p className="text-sm font-medium text-slate-700 mt-2 max-w-2xl leading-relaxed">
            La interfaz de supervisión de Dirección se encuentra en proceso de modernización visual Stitch.
            Las funciones institucionales y operativas se encuentran disponibles a través del menú lateral.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
          <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-xs flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#13594A]/10 text-[#13594A]">
              <InstitutionalBrandIcon className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-800 block">
                Nivel de Autoridad
              </span>
              <span className="text-xs font-semibold text-[#13594A]">
                Dirección Institucional
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tarjeta de estado institucional */}
      <div className="bg-gradient-to-br from-[#13594A] to-[#0A3D32] rounded-3xl p-8 text-white shadow-[0_8px_30px_rgba(19,89,74,0.12)] relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <span className="inline-block px-3 py-1 rounded-full bg-white/15 text-white text-[11px] font-bold tracking-wide uppercase mb-3 backdrop-blur-xs">
            Guía de Dirección Institucional
          </span>
          <h2 className="text-xl md:text-2xl font-bold mb-3 tracking-tight">
            Administración Central y Supervisión Académica
          </h2>
          <p className="text-sm text-[#E6F4F1] leading-relaxed mb-6 font-medium">
            Como Director, cuenta con atribuciones completas para configurar años lectivos, supervisar nóminas
            y actas oficiales, auditar evaluaciones docentes, autorizar vinculaciones USB y resguardar la base
            de datos local de la institución.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigate('configuracion-academica')}
              className="px-4 py-2.5 bg-white text-[#004034] hover:bg-[#E6F4F1] font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#13594A]"
            >
              <span>Configurar año lectivo</span>
              <ArrowForwardIcon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('cuentas')}
              className="px-4 py-2.5 bg-[#004034]/60 hover:bg-[#004034]/80 text-white font-semibold text-xs rounded-xl border border-white/20 transition-all flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#13594A]"
            >
              <span>Gestionar usuarios y aulas</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('respaldo')}
              className="px-4 py-2.5 bg-[#004034]/60 hover:bg-[#004034]/80 text-white font-semibold text-xs rounded-xl border border-white/20 transition-all flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#13594A]"
            >
              <span>Respaldo y seguridad</span>
            </button>
          </div>
        </div>

        {/* Decoración de fondo */}
        <div className="absolute -right-8 -bottom-8 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Módulos de Dirección */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[#0D382F] tracking-tight">
            Módulos autorizados para Dirección
          </h3>
          <span className="text-xs font-semibold text-slate-500">
            6 accesos principales
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {administrativeActions.map((action) => (
            <div
              key={action.route}
              className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-[#13594A]/30 hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-xl bg-[#E6F4F1] border border-[#13594A]/10">
                    {action.icon}
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                    {action.badge}
                  </span>
                </div>
                <h4 className="text-[15px] font-bold text-[#172B28] group-hover:text-[#13594A] transition-colors mb-2">
                  {action.title}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed font-normal mb-5">
                  {action.description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onNavigate(action.route)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-[#E6F4F1] text-slate-700 hover:text-[#004034] text-xs font-bold transition-all flex items-center justify-center gap-2 group/btn focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13594A]"
              >
                <span>Acceder al módulo</span>
                <ArrowForwardIcon className="w-3.5 h-3.5 text-slate-500 group-hover/btn:text-[#13594A] group-hover/btn:translate-x-0.5 transition-all" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PanelDireccionProvisional;
