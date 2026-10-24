import React from 'react';
import { NavRoute, UserRole } from '../../../types';
import {
  DashboardIcon,
  StudentsIcon,
  GroupsIcon,
  AttendanceIcon,
  EvaluationIcon,
  DocumentIcon,
  SyncIcon,
  ProfileIcon,
  EnrollmentIcon,
  DocConfigIcon,
  DeliveriesIcon,
  DataExchangeIcon,
  AccountsIcon,
  AcademicConfigIcon,
  BackupIcon,
  InstitutionalBrandIcon,
} from '../Icons';
import StatusBadge from '../StatusBadge/StatusBadge';

export interface SidebarProps {
  currentRoute: NavRoute;
  onRouteChange: (route: NavRoute) => void;
  role?: UserRole;
}

interface NavItemConfig {
  id: NavRoute;
  label: string;
  originalRoute: string;
  icon: React.ReactNode;
}

interface NavCategory {
  title: string;
  items: NavItemConfig[];
}

// Políticas oficiales de rutas según scripts/role-policy.cjs
const ROLE_POLICY_ROUTES: Record<UserRole, NavRoute[]> = {
  DIRECTOR: [
    'inicio',
    'estudiantes',
    'matriculas',
    'grupos',
    'evaluacion',
    'asistencia',
    'documentos',
    'configuracion-documental',
    'entregas',
    'datos',
    'cuentas',
    'sincronizacion',
    'respaldo',
    'configuracion-academica',
    'perfil',
  ],
  SECRETARIA: [
    'inicio',
    'estudiantes',
    'matriculas',
    'grupos',
    'evaluacion',
    'asistencia',
    'documentos',
    'configuracion-documental',
    'entregas',
    'datos',
    'cuentas',
    'sincronizacion',
    'configuracion-academica',
    'perfil',
  ],
  DOCENTE: [
    'inicio',
    'estudiantes',
    'grupos',
    'evaluacion',
    'asistencia',
    'documentos',
    'configuracion-documental',
    'entregas',
    'datos',
    'cuentas',
    'sincronizacion',
    'perfil',
  ],
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onRouteChange,
  role = 'DOCENTE',
}) => {
  const isTeacher = role === 'DOCENTE';
  const isDirector = role === 'DIRECTOR';
  const authorizedRoutes = ROLE_POLICY_ROUTES[role] || ROLE_POLICY_ROUTES.DOCENTE;

  // Categorías de navegación fieles a app.js del sistema oficial
  const categories: NavCategory[] = [
    {
      title: 'Operación académica',
      items: [
        {
          id: 'inicio',
          label: isTeacher ? 'Inicio / Mis Aulas' : 'Inicio institucional',
          originalRoute: '#/inicio',
          icon: <DashboardIcon className="w-5 h-5 shrink-0" />,
        },
        {
          id: 'estudiantes',
          label: isTeacher ? 'Mis estudiantes' : 'Estudiantes',
          originalRoute: '#/estudiantes',
          icon: <StudentsIcon className="w-5 h-5 shrink-0" />,
        },
        {
          id: 'matriculas',
          label: 'Matrículas',
          originalRoute: '#/matriculas',
          icon: <EnrollmentIcon className="w-5 h-5 shrink-0" />,
        },
        {
          id: 'grupos',
          label: isTeacher ? 'Mis grupos' : 'Grupos y aulas',
          originalRoute: '#/grupos',
          icon: <GroupsIcon className="w-5 h-5 shrink-0" />,
        },
        {
          id: 'asistencia',
          label: isTeacher ? 'Asistencia' : 'Consultar asistencia',
          originalRoute: '#/asistencia',
          icon: <AttendanceIcon className="w-5 h-5 shrink-0" />,
        },
        {
          id: 'evaluacion',
          label: isTeacher ? 'Evaluación' : 'Consultar notas',
          originalRoute: '#/evaluacion',
          icon: <EvaluationIcon className="w-5 h-5 shrink-0" />,
        },
      ],
    },
    {
      title: 'Documentación oficial',
      items: [
        {
          id: 'documentos',
          label: isTeacher ? 'Mis documentos' : 'Documentos',
          originalRoute: '#/documentos',
          icon: <DocumentIcon className="w-5 h-5 shrink-0" />,
        },
        {
          id: 'configuracion-documental',
          label: isTeacher ? 'Preparar unidad' : 'Datos de documentos',
          originalRoute: '#/configuracion-documental',
          icon: <DocConfigIcon className="w-5 h-5 shrink-0" />,
        },
        {
          id: 'entregas',
          label: 'Entregas y revisión',
          originalRoute: '#/entregas',
          icon: <DeliveriesIcon className="w-5 h-5 shrink-0" />,
        },
      ],
    },
    {
      title: 'Gestión institucional',
      items: [
        {
          id: 'sincronizacion',
          label: 'Sincronización USB',
          originalRoute: '#/sincronizacion',
          icon: <SyncIcon className="w-5 h-5 shrink-0" />,
        },
        {
          id: 'datos',
          label: 'Actualizar y exportar datos',
          originalRoute: '#/datos',
          icon: <DataExchangeIcon className="w-5 h-5 shrink-0" />,
        },
        {
          id: 'configuracion-academica',
          label: 'Configuración por año',
          originalRoute: '#/configuracion-academica',
          icon: <AcademicConfigIcon className="w-5 h-5 shrink-0" />,
        },
        {
          id: 'cuentas',
          label: isDirector
            ? 'Usuarios y asignaciones'
            : isTeacher
            ? 'Mi ficha institucional'
            : 'Registrar docentes',
          originalRoute: '#/cuentas',
          icon: <AccountsIcon className="w-5 h-5 shrink-0" />,
        },
        {
          id: 'respaldo',
          label: 'Respaldo y migración',
          originalRoute: '#/respaldo',
          icon: <BackupIcon className="w-5 h-5 shrink-0" />,
        },
        {
          id: 'perfil',
          label: isTeacher ? 'Mi perfil docente' : 'Mi cuenta',
          originalRoute: '#/perfil',
          icon: <ProfileIcon className="w-5 h-5 shrink-0" />,
        },
      ],
    },
  ];

  const handleNavClick = (e: React.MouseEvent, id: NavRoute) => {
    e.preventDefault();
    onRouteChange(id);
  };

  return (
    <aside
      className="fixed left-0 top-0 h-full w-64 bg-white z-50 flex flex-col justify-between border-r border-slate-200/90 shadow-[0_0_24px_rgba(0,0,0,0.02)] select-none"
      aria-label="Menú principal de navegación"
    >
      <div className="flex flex-col min-h-0 flex-1">
        {/* Brand Logo Section */}
        <div className="h-20 px-6 flex items-center gap-3 border-b border-slate-100 shrink-0">
          <div className="p-1 rounded-xl bg-[#13594A]/10 border border-[#13594A]/15 flex items-center justify-center shrink-0">
            <InstitutionalBrandIcon className="w-7 h-7" />
          </div>
          <div className="flex flex-col">
            <span className="text-[15px] font-bold tracking-tight text-[#0D382F] leading-tight">
              CEPRO_MICAELA
            </span>
            <span className="text-[10px] font-semibold tracking-wider text-slate-600 uppercase">
              Gestión Académica 2.0
            </span>
          </div>
        </div>

        {/* Navigation Categories Container with Smooth Scrolling */}
        <nav
          className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6 focus:outline-none"
          aria-label={`Menú de navegación para ${role}`}
        >
          {categories.map((category) => {
            // Filtrar únicamente los ítems permitidos por la política de rol
            const visibleItems = category.items.filter((item) =>
              authorizedRoutes.includes(item.id)
            );

            if (visibleItems.length === 0) return null;

            return (
              <div key={category.title} className="flex flex-col gap-1">
                <span className="px-3 pb-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {category.title}
                </span>
                {visibleItems.map((item) => {
                  const isActive = currentRoute === item.id;
                  return (
                    <a
                      key={item.id}
                      href={item.originalRoute}
                      onClick={(e) => handleNavClick(e, item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={
                        isActive
                          ? 'relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-[#e6f4f1]/80 text-[#004034] font-semibold text-[13px] shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13594A] focus-visible:ring-offset-2'
                          : 'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-700 hover:text-[#004034] hover:bg-slate-50 font-medium text-[13px] transition-all group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13594A] focus-visible:ring-offset-2'
                      }
                    >
                      {isActive && (
                        <span className="absolute left-0 top-2 bottom-2 w-1 bg-[#13594A] rounded-r-full" />
                      )}
                      <span
                        className={
                          isActive
                            ? 'text-[#13594A]'
                            : 'text-slate-500 group-hover:text-[#13594A] transition-colors'
                        }
                        aria-hidden="true"
                      >
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </a>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Bottom Institutional Badge Section */}
      <div className="p-4 mx-3 mb-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col gap-2.5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#13594A] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#13594A]" />
            </span>
            <span className="text-[11px] font-semibold text-slate-800">
              Modo Seguro Offline
            </span>
          </div>
          <span className="text-[9px] font-bold text-[#004034] bg-[#c0ecde] px-1.5 py-0.5 rounded-md">
            v2.0
          </span>
        </div>
        <StatusBadge />
      </div>
    </aside>
  );
};

export default Sidebar;
