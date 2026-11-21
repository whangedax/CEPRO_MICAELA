/**
 * context/WorkspaceContext.tsx
 * 
 * Contexto de Espacio de Trabajo Académico para CEPRO_MICAELA 2.0.
 * Gestiona la carga de opciones autorizadas (GET /api/workspace/options),
 * la selección formal de aula y unidad didáctica (POST /api/workspace),
 * y la consulta del dashboard contextual (GET /api/dashboard).
 * 
 * Incluye el control global del Asistente Guiado de Selección por Ventanas
 * (isSelectorOpen, selectorStep, openSelector, closeSelector).
 * 
 * Garantiza que al cambiar de usuario o cerrar sesión se limpie completamente
 * cualquier dato académico previo.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  isSelectorOpen: boolean;
  selectorStep: 1 | 2 | 3;
  openSelector: (step?: 1 | 2 | 3) => void;
  closeSelector: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [options, setOptions] = useState<WorkspaceOptionsResponse | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<IWorkspaceContext | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSelectorOpen, setIsSelectorOpen] = useState<boolean>(false);
  const [selectorStep, setSelectorStep] = useState<1 | 2 | 3>(1);

  const optionsRequest = useRef(0);
  const workspaceRevision = useRef(0);

  const openSelector = useCallback((step?: 1 | 2 | 3) => {
    setSelectorStep(step ?? 1);
    setIsSelectorOpen(true);
  }, []);

  const closeSelector = useCallback(() => {
    setIsSelectorOpen(false);
  }, []);

  const clearWorkspace = useCallback(() => {
    optionsRequest.current++;
    workspaceRevision.current++;
    setOptions(null);
    setActiveWorkspace(null);
    setDashboardData(null);
    setError(null);
    setIsLoading(false);
    setIsSelectorOpen(false);
  }, []);

  // Limpiar contexto cuando cambie el usuario o se cierre sesión
  useEffect(() => {
    if (!isAuthenticated || !user) {
      clearWorkspace();
    }
  }, [isAuthenticated, user, clearWorkspace]);

  const loadOptions = useCallback(async () => {
    if (!isAuthenticated) return;
    const request = ++optionsRequest.current;
    const revision = workspaceRevision.current;
    setIsLoading(true);
    setError(null);
    try {
      const opts = await apiClient.getWorkspaceOptions();
      if (optionsRequest.current !== request) return;
      setOptions(opts);
      if (workspaceRevision.current !== revision) return;

      // Cargar estado inicial del dashboard para verificar si ya existe un workspace en sesión
      try {
        const dash = await apiClient.getDashboard();
        if (optionsRequest.current !== request || workspaceRevision.current !== revision) return;
        setDashboardData(dash);
        if (dash.workspace) {
          setActiveWorkspace(dash.workspace);
        }
      } catch {
        // Si no hay dashboard disponible aún, se mantiene en null
      }
    } catch (err: unknown) {
      if (optionsRequest.current !== request || workspaceRevision.current !== revision) return;
      const apiErr = err as ApiError;
      setError(apiErr?.error || 'No se pudieron cargar las opciones académicas.');
    } finally {
      if (optionsRequest.current === request && workspaceRevision.current === revision) setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Cargar opciones al autenticar
  useEffect(() => {
    if (isAuthenticated && user) {
      loadOptions();
    }
  }, [isAuthenticated, user, loadOptions]);

  const selectWorkspace = useCallback(async (payload: SelectWorkspacePayload): Promise<IWorkspaceContext> => {
    let revision = ++workspaceRevision.current;
    setIsLoading(true);
    setError(null);
    try {
      const context = await apiClient.selectWorkspace(payload);
      if (workspaceRevision.current !== revision) return context;
      revision = ++workspaceRevision.current;
      setActiveWorkspace(context);
      setDashboardData(null);

      // Inmediatamente consultar dashboard con el nuevo contexto
      const dash = await apiClient.getDashboard();
      if (workspaceRevision.current !== revision) return context;
      setDashboardData(dash);
      setIsSelectorOpen(false);
      return context;
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      const msg = apiErr?.error || 'Error al seleccionar el espacio de trabajo académico.';
      if (workspaceRevision.current === revision) setError(msg);
      throw err;
    } finally {
      if (workspaceRevision.current === revision) setIsLoading(false);
    }
  }, []);

  const selectGroupAndUnit = useCallback(
    async (
      group: WorkspaceGroupOption,
      mode: 'UNIT' | 'MODULE' | 'PRACTICE',
      unitCode?: string
    ): Promise<IWorkspaceContext> => {
      const effectiveMode = unitCode === 'EFSRT' ? 'PRACTICE' : mode;
      const payload: SelectWorkspacePayload = {
        year: group.year,
        periodId: group.periodId,
        programId: group.programId,
        moduleId: group.moduleId,
        groupId: group.id,
        mode: effectiveMode,
        unit: effectiveMode === 'UNIT' ? unitCode : effectiveMode === 'PRACTICE' ? 'EFSRT' : undefined,
      };
      const ctx = await selectWorkspace(payload);
      setIsSelectorOpen(false);
      return ctx;
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
        isSelectorOpen,
        selectorStep,
        openSelector,
        closeSelector,
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
