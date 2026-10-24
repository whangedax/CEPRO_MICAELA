/**
 * App.tsx
 * 
 * Componente Raíz de CEPRO_MICAELA 2.0.
 * Gestiona la autenticación institucional y la separación estricta de interfaces por rol:
 * - DOCENTE: Dashboard Docente Stitch premium (#13594A, #F6F8FA).
 * - DIRECTOR: Panel de Dirección institucional provisional.
 * - SECRETARIA: Panel de Secretaría institucional provisional.
 * Controla políticas de navegación autorizadas (scripts/role-policy.cjs),
 * reseteo de navegación al cerrar sesión y navegación segura por teclado.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { NavRoute, UserProfile, UserRole } from './types';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { PendingChangesProvider, usePendingChanges } from './context/PendingChangesContext';
import AppShell from './components/AppShell';
import DashboardDocente from './pages/DashboardDocente';
import DashboardDireccion from './pages/DashboardDireccion';
import DashboardSecretaria from './pages/DashboardSecretaria';
import GestionEstudiantes from './pages/GestionEstudiantes';
import GestionMatriculas from './pages/GestionMatriculas';
import GestionGrupos from './pages/GestionGrupos';
import RegistroAsistencia from './pages/RegistroAsistencia';
import RegistroEvaluaciones from './pages/RegistroEvaluaciones';
import CentroDocumental from './pages/CentroDocumental';
import ConfiguracionDocumental from './pages/ConfiguracionDocumental';
import EntregasRevision from './pages/EntregasRevision';
import GestionCuentas from './pages/GestionCuentas';
import ConfiguracionAcademica from './pages/ConfiguracionAcademica';
import Sincronizacion from './pages/Sincronizacion';
import RespaldoRestauracion from './pages/RespaldoRestauracion';
import PlaceholderPage from './pages/PlaceholderPage';
import LoginPage from './pages/LoginPage';

// Rutas globales reconocidas por el sistema
const validRoutes: Record<string, NavRoute> = {
  'inicio': 'inicio',
  'estudiantes': 'estudiantes',
  'matriculas': 'matriculas',
  'grupos': 'grupos',
  'asistencia': 'asistencia',
  'evaluacion': 'evaluacion',
  'documentos': 'documentos',
  'configuracion-documental': 'configuracion-documental',
  'entregas': 'entregas',
  'datos': 'datos',
  'cuentas': 'cuentas',
  'sincronizacion': 'sincronizacion',
  'respaldo': 'respaldo',
  'configuracion-academica': 'configuracion-academica',
  'perfil': 'perfil',
};

// Políticas oficiales de rutas según scripts/role-policy.cjs
const ROLE_POLICIES: Record<UserRole, NavRoute[]> = {
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

function parseHash(hash: string): NavRoute {
  const clean = hash.replace(/^#\/?/, '').split('?')[0].trim().toLowerCase();
  if (!clean || clean === 'inicio' || clean === 'mis-aulas') {
    return 'inicio';
  }
  return validRoutes[clean] || 'inicio';
}

const AppContent: React.FC = () => {
  const { user, systemStatus, isAuthenticated, isLoading, logout } = useAuth();
  const { requestSafeTransition, hasPendingChanges } = usePendingChanges();
  const [currentRoute, setCurrentRoute] = useState<NavRoute>(() =>
    parseHash(window.location.hash)
  );

  const targetRouteRef = React.useRef<NavRoute | null>(null);

  const handleRouteChange = useCallback((route: NavRoute) => {
    requestSafeTransition(() => {
      targetRouteRef.current = route;
      setCurrentRoute(route);
      window.location.hash = `#/${route}`;
    });
  }, [requestSafeTransition]);

  // Escuchar cambios de hash manuales o en el navegador
  useEffect(() => {
    const handleHashChange = () => {
      const parsed = parseHash(window.location.hash);
      if (parsed === currentRoute) return;

      if (targetRouteRef.current === parsed) {
        targetRouteRef.current = null;
        setCurrentRoute(parsed);
        return;
      }

      if (hasPendingChanges) {
        const prevHash = `#/${currentRoute}`;
        requestSafeTransition(() => {
          targetRouteRef.current = parsed;
          setCurrentRoute(parsed);
          window.location.hash = `#/${parsed}`;
        });
        window.history.pushState(null, '', prevHash);
      } else {
        setCurrentRoute(parsed);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentRoute, hasPendingChanges, requestSafeTransition]);

  // Requisito 8: Validación de rutas autorizadas y reseteo si el rol no tiene permiso
  useEffect(() => {
    if (user) {
      const allowedRoutes = user.role && ROLE_POLICIES[user.role] ? ROLE_POLICIES[user.role] : [];
      if (!allowedRoutes.includes(currentRoute)) {
        // Redirigir a inicio si intenta acceder a ruta no autorizada
        handleRouteChange('inicio');
      }
    }
  }, [user, currentRoute, handleRouteChange]);

  // Requisito 10: Al cerrar sesión, eliminar el estado de navegación anterior con protección segura
  const handleLogout = async () => {
    requestSafeTransition(async () => {
      window.location.hash = '#/inicio';
      setCurrentRoute('inicio');
      await logout();
    });
  };

  // Mapear usuario autenticado real a UserProfile para Topbar y AppShell
  const userProfile: UserProfile = useMemo(() => {
    if (!user) {
      return {
        name: 'Usuario no autenticado',
        role: 'Invitado',
        period: 'Periodo 2026-I',
        institution: systemStatus?.institutionName || 'CEPRO_MICAELA',
        institutionSub: 'Gestión Académica 2.0',
      };
    }

    const roleName: Record<UserRole, string> = {
      DIRECTOR: 'Dirección Institucional',
      SECRETARIA: 'Secretaría Académica',
      DOCENTE: 'Docente Titular',
    };

    return {
      name: user.name,
      role: roleName[user.role] || user.role,
      period: 'Periodo 2026-I',
      institution: systemStatus?.institutionName || 'CEPRO_MICAELA',
      institutionSub: 'Gestión Académica 2.0',
    };
  }, [user, systemStatus]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F6F8FA] flex flex-col items-center justify-center text-[#172B28] antialiased">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#13594A]/20 border-t-[#13594A] rounded-full animate-spin" />
          <span className="text-[13px] font-semibold text-slate-700">
            Conectando con el servicio local…
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Renderizado condicional por rol en inicio
  const renderContent = () => {
    if (currentRoute === 'inicio') {
      if (user?.role === 'DIRECTOR') {
        return <DashboardDireccion onNavigate={handleRouteChange} />;
      }
      if (user?.role === 'SECRETARIA') {
        return <DashboardSecretaria onNavigate={handleRouteChange} />;
      }
      if (user?.role === 'DOCENTE') {
        return <DashboardDocente />;
      }
      return (
        <div className="p-8 text-center text-red-700 bg-red-50 rounded-2xl border border-red-200 m-6">
          <h2 className="text-lg font-bold">Rol no autorizado o desconocido</h2>
          <p className="text-sm mt-1">Su cuenta no cuenta con un rol válido asignado en el sistema.</p>
        </div>
      );
    }

    if (currentRoute === 'estudiantes') {
      return <GestionEstudiantes onNavigate={handleRouteChange} />;
    }

    if (currentRoute === 'matriculas') {
      return <GestionMatriculas onNavigate={handleRouteChange} />;
    }

    if (currentRoute === 'grupos') {
      return <GestionGrupos onNavigate={handleRouteChange} />;
    }

    if (currentRoute === 'asistencia') {
      return <RegistroAsistencia />;
    }

    if (currentRoute === 'evaluacion') {
      return <RegistroEvaluaciones />;
    }

    if (currentRoute === 'documentos') {
      return <CentroDocumental />;
    }

    if (currentRoute === 'configuracion-documental') {
      return <ConfiguracionDocumental />;
    }

    if (currentRoute === 'entregas') {
      return <EntregasRevision />;
    }

    if (currentRoute === 'cuentas') {
      return <GestionCuentas onNavigate={handleRouteChange} />;
    }

    if (currentRoute === 'configuracion-academica') {
      return <ConfiguracionAcademica onNavigate={handleRouteChange} />;
    }

    if (currentRoute === 'sincronizacion') {
      return <Sincronizacion onNavigate={handleRouteChange} />;
    }

    if (currentRoute === 'respaldo') {
      return <RespaldoRestauracion onNavigate={handleRouteChange} />;
    }

    return (
      <PlaceholderPage
        route={currentRoute}
        onGoHome={() => handleRouteChange('inicio')}
      />
    );
  };

  return (
    <AppShell
      currentRoute={currentRoute}
      onRouteChange={handleRouteChange}
      user={userProfile}
      role={user?.role}
      onLogout={handleLogout}
    >
      {renderContent()}
    </AppShell>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <PendingChangesProvider>
          <AppContent />
        </PendingChangesProvider>
      </WorkspaceProvider>
    </AuthProvider>
  );
};

export default App;
