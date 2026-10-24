/**
 * context/WorkspaceContext.tsx
 * 
 * Contexto de Espacio de Trabajo Académico para CEPRO_MICAELA 2.0.
 * Gestiona la carga de opciones autorizadas (GET /api/workspace/options),
 * la selección formal de aula y unidad didáctica (POST /api/workspace),
 * y la consulta del dashboard contextual (GET /api/dashboard).
 * 
 * Garantiza que al cambiar de usuario o cerrar sesión se limpie completamente
 * cualquier dato académico previo.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import {
  WorkspaceOptionsResponse,
  WorkspaceGroupOption,
  SelectWorkspacePayload,
  WorkspaceContext as IWorkspaceContext,
  DashboardResponse,
  ApiError,
} from '../api/types';
import { useAuth } from './AuthContext';

interface WorkspaceContextType {
  options: WorkspaceOptionsResponse | null;
  activeWorkspace: IWorkspaceContext | null;
  dashboardData: DashboardResponse | null;
  isLoading: boolean;
  error: string | null;
  loadOptions: () => Promise<void>;
  selectWorkspace: (payload: SelectWorkspacePayload) => Promise<IWorkspaceContext>;
  selectGroupAndUnit: (
    group: WorkspaceGroupOption,
    mode: 'UNIT' | 'MODULE' | 'PRACTICE',
    unitCode?: string
  ) => Promise<IWorkspaceContext>;
  clearWorkspace: () => void;
  selectedGroup: WorkspaceGroupOption | null;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [options, setOptions] = useState<WorkspaceOptionsResponse | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<IWorkspaceContext | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const clearWorkspace = useCallback(() => {
    setOptions(null);
    setActiveWorkspace(null);
    setDashboardData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  // Limpiar contexto cuando cambie el usuario o se cierre sesión
  useEffect(() => {
    if (!isAuthenticated || !user) {
      clearWorkspace();
    }
  }, [isAuthenticated, user, clearWorkspace]);

  const loadOptions = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    setError(null);
    try {
      const opts = await apiClient.getWorkspaceOptions();
      setOptions(opts);

      // Cargar estado inicial del dashboard para verificar si ya existe un workspace en sesión
      try {
        const dash = await apiClient.getDashboard();
        setDashboardData(dash);
        if (dash.workspace) {
          setActiveWorkspace(dash.workspace);
        }
      } catch {
        // Si no hay dashboard disponible aún, se mantiene en null
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.error || 'No se pudieron cargar las opciones académicas.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Cargar opciones al autenticar
  useEffect(() => {
    if (isAuthenticated && user) {
      loadOptions();
    }
  }, [isAuthenticated, user, loadOptions]);

  const selectWorkspace = useCallback(async (payload: SelectWorkspacePayload): Promise<IWorkspaceContext> => {
    setIsLoading(true);
    setError(null);
    try {
      const context = await apiClient.selectWorkspace(payload);
      setActiveWorkspace(context);

      // Inmediatamente consultar dashboard con el nuevo contexto
      const dash = await apiClient.getDashboard();
      setDashboardData(dash);
      return context;
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      const msg = apiErr?.error || 'Error al seleccionar el espacio de trabajo académico.';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectGroupAndUnit = useCallback(
    async (
      group: WorkspaceGroupOption,
      mode: 'UNIT' | 'MODULE' | 'PRACTICE',
      unitCode?: string
    ): Promise<IWorkspaceContext> => {
      const payload: SelectWorkspacePayload = {
        year: group.year,
        programId: group.programId,
        moduleId: group.moduleId,
        groupId: group.id,
        mode,
        unit: mode === 'UNIT' ? unitCode : mode === 'PRACTICE' ? 'EFSRT' : undefined,
      };
      return selectWorkspace(payload);
    },
    [selectWorkspace]
  );

  const selectedGroup = React.useMemo(() => {
    if (!options || !activeWorkspace || !activeWorkspace.groupId) return null;
    return options.groups.find((g) => g.id === activeWorkspace.groupId) || null;
  }, [options, activeWorkspace]);

  return (
    <WorkspaceContext.Provider
      value={{
        options,
        activeWorkspace,
        dashboardData,
        isLoading,
        error,
        loadOptions,
        selectWorkspace,
        selectGroupAndUnit,
        clearWorkspace,
        selectedGroup,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace debe ser utilizado dentro de un WorkspaceProvider');
  }
  return context;
};

export default WorkspaceContext;
