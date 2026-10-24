import React from 'react';
import { NavRoute, UserProfile, UserRole } from '../types';
import Sidebar from './ui/Sidebar/Sidebar';
import Topbar from './ui/Topbar/Topbar';

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
  // NOTA AUDITORÍA AGENTE 04 / CALIDAD:
  // Los atajos globales Ctrl+1, Ctrl+2, Ctrl+3 procedían del prototipo Stitch y no
  // pertenecen al sistema original de CEPRO_MICAELA. Se desactivan de forma segura
  // hasta recibir aprobación formal del equipo institucional para evitar colisiones
  // con atajos nativos del navegador o reglas de accesibilidad.

  return (
    <div className="min-h-screen bg-[#F6F8FA] text-[#172B28] antialiased">
      {/* Sidebar fijo a la izquierda */}
      <Sidebar
        currentRoute={currentRoute}
        onRouteChange={onRouteChange}
        role={role}
      />

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
        <main className="relative pt-20 w-full min-h-screen bg-[#F6F8FA] px-10 py-10" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppShell;
