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
} from '../Icons';
import { InstitutionalLogo } from '../InstitutionalLogo';
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
    'ficha-registro-2026',
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
    'ficha-registro-2026',
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
          id: 'ficha-registro-2026',
          label: 'Ficha Registro 2026 (QR)',
          originalRoute: '#/ficha-registro-2026',
          icon: <DocumentIcon className="w-5 h-5 shrink-0" />,
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
          label: 'Compartir entre equipos',
          originalRoute: '#/sincronizacion',
          icon: <SyncIcon className="w-5 h-5 shrink-0" />,
        },
        {
          id: 'datos',
          label: 'Trabajar con archivos',
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
      className="fixed left-0 top-0 h-full w-[72px] md:w-64 bg-[var(--ui-sidebar)] text-[#e7f0eb] z-50 flex flex-col justify-between border-r border-[#194c3f] dark:border-[#18382f] shadow-[0_0_24px_rgba(0,0,0,0.06)] select-none transition-colors duration-200"
      aria-label="Menú principal de navegación"
    >
      <div className="flex flex-col min-h-0 flex-1">
        {/* Brand Logo Section */}
        <div className="flex h-32 shrink-0 items-center justify-center gap-3 border-b border-[#2c5649] px-3 dark:border-[#1a3e34] md:justify-start md:px-5 lg:h-20">
          <InstitutionalLogo className="h-[68px] w-12" />
          <div className="hidden min-w-0 flex-col gap-1 md:flex">
            <span className="text-base font-semibold leading-5 tracking-tight text-white">CEPRO_MICAELA</span>
            <span className="text-xs font-normal leading-4 text-[#b5cfc0]">Gestión académica 2.0</span>
          </div>
        </div>

        {/* Navigation Categories Container with Smooth Scrolling */}
        <nav
          className="flex-1 overflow-y-auto px-2 md:px-3.5 py-4 space-y-6 focus:outline-none"
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
                <span className="hidden md:block px-3 pb-1 text-xs font-semibold text-[#a8c5b7] tracking-wide">
                  {category.title}
                </span>
                {visibleItems.map((item) => {
                  const isActive = currentRoute === item.id;
                  return (
                    <a
                      key={item.id}
                      href={item.originalRoute}
                      title={item.label}
                      onClick={(e) => handleNavClick(e, item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={
                        isActive
                          ? 'relative min-h-[44px] flex items-center justify-center md:justify-start gap-3 px-2 md:px-3.5 py-2.5 rounded-[10px] bg-[var(--ui-sidebar-active)] text-[#103e33] dark:text-[#f0fdf8] font-semibold text-[13px] shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition-all group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b5e9ca] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ui-sidebar)]'
                          : 'min-h-[44px] flex items-center justify-center md:justify-start gap-3 px-2 md:px-3.5 py-2.5 rounded-[10px] text-[#d5e5dc] hover:text-white hover:bg-[#1b4d3f] dark:hover:bg-[#16382f] font-medium text-[13px] transition-all group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b5e9ca] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ui-sidebar)]'
                      }
                    >
                      {isActive && (
                        <span className="hidden md:block absolute left-0 top-2 bottom-2 w-1 bg-[#13594A] dark:bg-[#98d5bb] rounded-r-full" aria-hidden="true" />
                      )}
                      <span
                        className={
                          isActive
                            ? 'text-[#13594A] dark:text-[#98d5bb]'
                            : 'text-[#aacaba] group-hover:text-white transition-colors'
                        }
                        aria-hidden="true"
                      >
                        {item.icon}
                      </span>
                      <span className="hidden md:block truncate">{item.label}</span>
                    </a>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Bottom Institutional Badge Section */}
      <div className="hidden md:flex p-4 mx-3 mb-4 rounded-2xl bg-[#17493b] dark:bg-[#11332a] border border-[#315d4c] dark:border-[#1f4a3e] flex-col gap-2.5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#98d5bb] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#98d5bb]" />
            </span>
            <span className="text-[11px] font-semibold text-[#e5f2e9]">
              Modo Seguro Offline
            </span>
          </div>
          <span className="text-[9px] font-bold text-[#103e33] dark:text-[#f0fdf8] bg-[#c0ecde] dark:bg-[#1f4a3e] px-1.5 py-0.5 rounded-md">
            v2.0
          </span>
        </div>
        <StatusBadge />
      </div>
    </aside>
  );
};

export default Sidebar;
