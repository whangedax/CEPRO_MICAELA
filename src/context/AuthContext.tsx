/**
 * context/AuthContext.tsx
 * 
 * Contexto de Autenticación de React para CEPRO_MICAELA 2.0.
 * Gestiona el ciclo de vida de la sesión, recuperación de usuario,
 * estado del nodo institucional y cierre de sesión seguro.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import { PublicUser, SystemStatus, LoginPayload, ApiError } from '../api/types';

interface AuthContextType {
  user: PublicUser | null;
  systemStatus: SystemStatus | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [token, setTokenState] = useState<string | null>(apiClient.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const status = await apiClient.getStatus();
      setSystemStatus(status);
    } catch {
      // Si el servicio no responde, mantener systemStatus en null
    }
  }, []);

  // Verificar sesión existente en el arranque
  useEffect(() => {
    let isMounted = true;

    // Configurar listener para cuando el backend invalide la sesión (401)
    apiClient.setOnUnauthorized(() => {
      if (isMounted) {
        setUser(null);
        setTokenState(null);
        setError('Su sesión ha expirado. Por favor, ingrese sus credenciales nuevamente.');
      }
    });

    const initAuth = async () => {
      try {
        const status = await apiClient.getStatus();
        if (isMounted) setSystemStatus(status);

        const existingToken = apiClient.getToken();
        if (existingToken) {
          try {
            const me = await apiClient.getMe();
            if (isMounted) {
              setUser(me);
              setTokenState(existingToken);
            }
          } catch {
            if (isMounted) {
              setUser(null);
              setTokenState(null);
            }
          }
        }
      } catch {
        // Error de conexión con el backend
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
      apiClient.setOnUnauthorized(() => {});
    };
  }, []);

  const login = async (credentials: LoginPayload) => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await apiClient.login(credentials);
      setUser(res.user);
      setTokenState(res.token);
      // Actualizar estado institucional post-login
      await refreshStatus();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      const message = apiErr?.error || 'No se pudo iniciar sesión. Verifique sus credenciales.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await apiClient.logout();
    } finally {
      setUser(null);
      setTokenState(null);
      setError(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        systemStatus,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        error,
        login,
        logout,
        refreshStatus,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};

export default AuthContext;
