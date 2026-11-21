import React, { useEffect } from 'react';
import { NavRoute, UserProfile, UserRole } from '../types';
import Sidebar from './ui/Sidebar/Sidebar';
import Topbar from './ui/Topbar/Topbar';
import AcademicWorkflowModal from './academic/AcademicWorkflowModal';
import { useWorkspace } from '../context/WorkspaceContext';

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
  const { closeSelector } = useWorkspace();

  useEffect(() => {
    if (currentRoute !== 'inicio') {
      closeSelector();
    }
  }, [currentRoute, closeSelector]);
  return (
    <div className="min-h-screen bg-[var(--ui-canvas)] text-[var(--ui-ink)] antialiased transition-colors duration-200">
      {/* Sidebar fijo a la izquierda */}
      <Sidebar
        currentRoute={currentRoute}
        onRouteChange={onRouteChange}
        role={role}
      />

      {/* Selector modal de contexto académico guiado (Ventanas Paso a Paso) */}
      <AcademicWorkflowModal onNavigate={onRouteChange} />

      {/* Área con desplazamiento y Topbar fijo */}
      <div className="pl-[72px] md:pl-64">
        <Topbar
          user={user}
          onLogout={onLogout}
          onProfileClick={() => {
            onRouteChange('perfil');
            window.location.hash = '#/perfil';
          }}
        />
        <main className="relative pt-36 pb-8 px-4 md:pb-10 md:px-6 lg:pt-28 xl:pt-28 xl:pb-12 xl:px-8 w-full min-h-screen bg-[var(--ui-canvas)] text-[var(--ui-ink)] transition-colors duration-200" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppShell;
