import React from 'react';
import { NavRoute, UserProfile, UserRole } from '../types';
import Sidebar from './ui/Sidebar/Sidebar';
import Topbar from './ui/Topbar/Topbar';
import AcademicWorkflowModal from './academic/AcademicWorkflowModal';

export interface AppShellProps {
  currentRoute: NavRoute;
  onRouteChange: (route: NavRoute) => void;
  user: UserProfile;
  role?: UserRole;
  onLogout?: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentRoute,
  onRouteChange,
  user,
  role = 'DOCENTE',
  onLogout,
  children,
}) => {
  return (
    <div className="min-h-screen bg-[#F6F8FA] dark:bg-[#0F1715] text-[#172B28] dark:text-[#F0FDF8] antialiased transition-colors duration-200">
      {/* Sidebar fijo a la izquierda */}
      <Sidebar
        currentRoute={currentRoute}
        onRouteChange={onRouteChange}
        role={role}
      />

      {/* Selector modal de contexto académico guiado (Ventanas Paso a Paso) */}
      <AcademicWorkflowModal onNavigate={onRouteChange} />

      {/* Área con desplazamiento y Topbar fijo */}
      <div className="pl-64">
        <Topbar
          user={user}
          onLogout={onLogout}
          onProfileClick={() => {
            onRouteChange('perfil');
            window.location.hash = '#/perfil';
          }}
        />
        <main className="relative pt-20 w-full min-h-screen bg-[#F6F8FA] dark:bg-[#0F1715] px-4 py-5 md:px-6 md:py-6 xl:px-10 xl:py-8 transition-colors duration-200" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppShell;
