/**
 * pages/RegistroEvaluaciones.tsx
 * 
 * Módulo Oficial de Registro de Evaluaciones y Calificaciones — CEPRO_MICAELA 2.0.
 * Conectado en tiempo real con el backend Node.js (POST /api/grades, GET /api/dashboard)
 * y SQLite sandbox local.
 * 
 * Tarea 17:
 * - Dominio de escala vigesimal (0 a 20): diferenciación estricta entre nota pendiente (null) y nota cero (0).
 * - 26 criterios de evaluación: 5 Indicadores (IL1..IL5) x 5 columnas (IA1, IA2, IA3, IL, R) + Logro UD (RESULTADO_UD).
 * - Pestañas interactivas de Indicadores 1 a 5, Resultado de la unidad y Matriz completa (26 columnas).
 * - Protección contra pérdida de cambios mediante PendingChangesContext (id: 'evaluaciones').
 * - Manejo robusto y accesible de conflictos de concurrencia HTTP 409 con resolución segura.
 * - Validación estricta de workspace (requiere modo UNIT; bloquea en modo MODULE o aula cerrada).
 * - Navegación ágil por teclado (Enter / Flecha Abajo para avanzar de estudiante en la misma columna).
 * - Estándar Google Stitch (#13594A, #0D3E34, #F6F8FA) y accesibilidad WCAG 2.2 AA.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { usePendingChanges } from '../context/PendingChangesContext';
import apiClient from '../api/client';
import {
  GradeRecord,
  GradeRowPayload,
  StudentEnrollmentItem,
  StudentItem,
  WorkspaceGroupOption,
  ApiError,
  DocumentConfigurationResponse,
} from '../api/types';
import { SelectUnitModal } from '../components/academic/SelectUnitModal';
import {
  EvaluationIcon,
  FolderOpenIcon,
  ArrowForwardIcon,
  InstitutionalBrandIcon,
  CheckroomIcon,
} from '../components/ui/Icons';

// =========================================================================
// DEFINICIÓN DE CRITERIOS ACADÉMICOS Y PESTAÑAS (MODELO CEPRO_MICAELA)
// =========================================================================

export const ALL_INDICATORS: string[] = [
  ...Array.from({ length: 5 }, (_, i) => [
    `IL${i + 1}.IA1`,
    `IL${i + 1}.IA2`,
    `IL${i + 1}.IA3`,
    `IL${i + 1}`,
    `IL${i + 1}.RECOVERY`,
  ]).flat(),
  'RESULTADO_UD',
];

export interface TabDefinition {
  id: number;
  name: string;
  shortLabel: string;
  indicators: string[];
}

export const EVALUATION_TABS: TabDefinition[] = [
  {
    id: 1,
    name: 'Indicador 1',
    shortLabel: 'Ind. 1',
    indicators: ['IL1.IA1', 'IL1.IA2', 'IL1.IA3', 'IL1', 'IL1.RECOVERY'],
  },
  {
    id: 2,
    name: 'Indicador 2',
    shortLabel: 'Ind. 2',
    indicators: ['IL2.IA1', 'IL2.IA2', 'IL2.IA3', 'IL2', 'IL2.RECOVERY'],
  },
  {
    id: 3,
    name: 'Indicador 3',
    shortLabel: 'Ind. 3',
    indicators: ['IL3.IA1', 'IL3.IA2', 'IL3.IA3', 'IL3', 'IL3.RECOVERY'],
  },
  {
    id: 4,
    name: 'Indicador 4',
    shortLabel: 'Ind. 4',
    indicators: ['IL4.IA1', 'IL4.IA2', 'IL4.IA3', 'IL4', 'IL4.RECOVERY'],
  },
  {
    id: 5,
    name: 'Indicador 5',
    shortLabel: 'Ind. 5',
    indicators: ['IL5.IA1', 'IL5.IA2', 'IL5.IA3', 'IL5', 'IL5.RECOVERY'],
  },
  {
    id: 6,
    name: 'Resultado de la unidad',
    shortLabel: 'Logro UD',
    indicators: ['RESULTADO_UD'],
  },
  {
    id: 0,
    name: 'Ver matriz completa',
    shortLabel: 'Matriz Completa',
    indicators: ALL_INDICATORS,
  },
];

export interface HeaderLabelInfo {
  code: string;
  title: string;
  typeBadge: string;
  help: string;
}

export function getIndicatorHeaderInfo(indicator: string): HeaderLabelInfo {
  if (indicator === 'RESULTADO_UD') {
    return {
      code: 'Logro UD',
      title: 'Resultado final de la unidad didáctica',
      typeBadge: 'Logro',
      help: 'Calificación confirmada de la unidad.',
    };
  }
  const parts = indicator.split('.');
  if (parts.length === 1) {
    return {
      code: parts[0],
      title: `Calificación integral del ${parts[0]}`,
      typeBadge: 'Indicador',
      help: `Nota de logro para ${parts[0]}.`,
    };
  }
  if (parts[1] === 'RECOVERY') {
    return {
      code: 'R',
      title: `Recuperación de ${parts[0]}`,
      typeBadge: 'Recup.',
      help: 'Nota de proceso de recuperación.',
    };
  }
  return {
    code: parts[1],
    title: `Instrumento ${parts[1]} (${parts[0]})`,
    typeBadge: 'Instrumento',
    help: `Instrumento de evaluación ${parts[1]}.`,
  };
}

// Clave única para cada celda: enrollmentId|indicator
const getCellKey = (enrollmentId: string, indicator: string) => `${enrollmentId}|${indicator}`;

interface GradeCellState {
  value: number | null;
  savedValue: number | null;
  rev?: string;
  isDirty: boolean;
}

interface GradeConflictItem {
  enrollmentId: string;
  studentName: string;
  document: string;
  indicator: string;
  localValue: number | null;
  serverValue: number | null;
  serverRev: string | null;
}

export const RegistroEvaluaciones: React.FC = () => {
  const { user } = useAuth();
  const {
    activeWorkspace,
    dashboardData,
    options,
    isLoading: isWorkspaceLoading,
    selectGroupAndUnit,
    loadOptions,
  } = useWorkspace();

  const { requestSafeTransition, registerPendingChanges, unregisterPendingChanges } =
    usePendingChanges();

  // Pestaña activa (1 a 5 = Indicadores, 6 = Resultado UD, 0 = Matriz completa)
  const [activeTab, setActiveTab] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Estado local de todas las celdas de evaluación (enrollmentId|indicator -> GradeCellState)
  const [cellsState, setCellsState] = useState<Record<string, GradeCellState>>({});

  // Configuración documental (capacidades e indicadores institucionales)
  const [docConfig, setDocConfig] = useState<DocumentConfigurationResponse | null>(null);

  // Estados de guardado y feedback
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveFeedback, setSaveFeedback] = useState<{
    type: 'success' | 'error' | 'conflict';
    message: string;
  } | null>(null);

  // Modal para confirmación de desmarcado (clear)
  const [pendingClearConfirm, setPendingClearConfirm] = useState<boolean>(false);

  // Estado para gestión y resolución segura de conflictos 409
  const [conflictItems, setConflictItems] = useState<GradeConflictItem[] | null>(null);
  const [isResolvingConflict, setIsResolvingConflict] = useState<boolean>(false);

  // Modal para cambiar unidad / aula
  const [isUnitModalOpen, setIsUnitModalOpen] = useState<boolean>(false);
  const [modalTargetGroup, setModalTargetGroup] = useState<WorkspaceGroupOption | null>(null);

  // Secuencia de sincronización para evitar respuestas obsoletas
  const syncSequenceRef = useRef<number>(0);

  // Referencias mutables para callbacks y transiciones seguras
  const cellsStateRef = useRef<Record<string, GradeCellState>>(cellsState);
  cellsStateRef.current = cellsState;

  const activeWorkspaceRef = useRef(activeWorkspace);
  activeWorkspaceRef.current = activeWorkspace;

  // Cargar configuración documental al montar
  useEffect(() => {
    let isMounted = true;
    apiClient
      .getDocumentConfiguration()
      .then((cfg) => {
        if (isMounted) setDocConfig(cfg);
      })
      .catch(() => {
        // Fallback silencioso; se usan descripciones estándar
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Identificar grupo activo
  const currentGroup = useMemo(() => {
    if (!dashboardData?.groups || !activeWorkspace?.groupId) return null;
    return (
      dashboardData.groups.find((g) => g.id === activeWorkspace.groupId) ||
      dashboardData.groups[0] ||
      null
    );
  }, [dashboardData, activeWorkspace]);

  // Verificar si el grupo está cerrado administrativamente
  const isGroupClosed = Boolean(currentGroup?.closed);

  // Verificar si el docente tiene asignada esta aula y unidad
  const isTeacher = user?.role === 'DOCENTE';
  const isAssigned = useMemo(() => {
    if (!isTeacher) return true;
    if (!user?.assignments || !activeWorkspace?.groupId || !activeWorkspace?.unit) return false;
    return user.assignments.some(
      (a) =>
        a.groupId === activeWorkspace.groupId &&
        (a.units || []).includes(activeWorkspace.unit as string)
    );
  }, [isTeacher, user, activeWorkspace]);

  // Sincronizar target para modal de selección de unidad
  useEffect(() => {
    if (options?.groups && activeWorkspace?.groupId) {
      const match = options.groups.find((g) => g.id === activeWorkspace.groupId);
      if (match) setModalTargetGroup(match);
      else if (options.groups.length > 0) setModalTargetGroup(options.groups[0]);
    } else if (options?.groups?.length) {
      setModalTargetGroup(options.groups[0]);
    }
  }, [options, activeWorkspace]);

  // Lista ordenada de estudiantes matriculados en el aula activa
  const rosterData = useMemo(() => {
    if (!dashboardData?.students || !dashboardData?.enrollments || !activeWorkspace?.groupId) {
      return [];
    }

    const studentsMap = new Map<string, StudentItem>();
    for (const s of dashboardData.students) {
      studentsMap.set(s.id, s);
    }

    const activeEnrollments = dashboardData.enrollments.filter(
      (e: StudentEnrollmentItem) => e.groupId === activeWorkspace.groupId && e.active
    );

    const list = activeEnrollments.map((en: StudentEnrollmentItem) => {
      const student = studentsMap.get(en.studentId);
      return {
        enrollment: en,
        student: student || {
          id: en.studentId,
          name: 'Estudiante no registrado',
          document: 'S/D',
          active: true,
        },
      };
    });

    list.sort((a, b) => a.student.name.localeCompare(b.student.name, 'es'));
    return list;
  }, [dashboardData, activeWorkspace]);

  // Clave del contexto activo para no resetear estado local innecesariamente
  const lastLoadedContextRef = useRef<string>('');

  // Sincronizar estado de celdas cuando cambie de aula o unidad
  useEffect(() => {
    if (!activeWorkspace?.unit || !activeWorkspace?.groupId || !dashboardData) {
      setCellsState({});
      lastLoadedContextRef.current = '';
      return;
    }

    const contextKey = `${activeWorkspace.groupId}:${activeWorkspace.unit}`;
    if (contextKey === lastLoadedContextRef.current) {
      // Mismo contexto: sincronizar valores de fondo sin perder modificaciones dirty
      const serverGrades = dashboardData.grades || [];
      setCellsState((prev) => {
        const next = { ...prev };
        let hasUpdates = false;

        for (const item of rosterData) {
          const enId = item.enrollment.id;
          for (const ind of ALL_INDICATORS) {
            const key = getCellKey(enId, ind);
            const current = next[key];
            const match = serverGrades.find(
              (g: GradeRecord) =>
                g.enrollmentId === enId &&
                g.unit === activeWorkspace.unit &&
                g.indicator === ind
            );

            const serverVal =
              match && typeof match.value === 'number' && Number.isFinite(match.value)
                ? match.value
                : null;
            const serverRev = match?.rev;

            if (!current) {
              next[key] = {
                value: serverVal,
                savedValue: serverVal,
                rev: serverRev,
                isDirty: false,
              };
              hasUpdates = true;
            } else if (!current.isDirty && (current.savedValue !== serverVal || current.rev !== serverRev)) {
              next[key] = {
                ...current,
                value: serverVal,
                savedValue: serverVal,
                rev: serverRev,
              };
              hasUpdates = true;
            }
          }
        }
        return hasUpdates ? next : prev;
      });
      return;
    }

    // Nuevo contexto (cambió aula o unidad): inicialización completa
    lastLoadedContextRef.current = contextKey;
    const serverGrades = dashboardData.grades || [];
    const newCells: Record<string, GradeCellState> = {};

    for (const item of rosterData) {
      const enId = item.enrollment.id;
      for (const ind of ALL_INDICATORS) {
        const key = getCellKey(enId, ind);
        const match = serverGrades.find(
          (g: GradeRecord) =>
            g.enrollmentId === enId &&
            g.unit === activeWorkspace.unit &&
            g.indicator === ind
        );

        const val =
          match && typeof match.value === 'number' && Number.isFinite(match.value)
            ? match.value
            : null;

        newCells[key] = {
          value: val,
          savedValue: val,
          rev: match?.rev,
          isDirty: false,
        };
      }
    }

    setCellsState(newCells);
    setSaveFeedback(null);
  }, [dashboardData, activeWorkspace, rosterData]);

  // Conteo de cambios no guardados
  const dirtyCount = useMemo(() => {
    return Object.values(cellsState).filter((c) => c.isDirty).length;
  }, [cellsState]);

  const hasUnsavedChanges = dirtyCount > 0;

  // Manejador del cambio de calificación en una celda
  const handleCellChange = useCallback(
    (enrollmentId: string, indicator: string, rawInput: string) => {
      if (isGroupClosed || !isTeacher) return;

      const trimmed = rawInput.trim();
      let nextValue: number | null = null;

      if (trimmed !== '') {
        const parsed = parseFloat(trimmed.replace(',', '.'));
        if (!isNaN(parsed)) {
          // Escala vigesimal estricta: 0 a 20 con hasta 2 decimales
          const clamped = Math.min(20, Math.max(0, parsed));
          nextValue = Math.round(clamped * 100) / 100;
        } else {
          return; // Entrada no numérica ignorada
        }
      }

      const key = getCellKey(enrollmentId, indicator);
      setCellsState((prev) => {
        const current = prev[key];
        const savedVal = current?.savedValue ?? null;
        const dirty = nextValue !== savedVal;

        return {
          ...prev,
          [key]: {
            value: nextValue,
            savedValue: savedVal,
            rev: current?.rev,
            isDirty: dirty,
          },
        };
      });

      // Limpiar mensaje de éxito al editar nuevamente
      if (saveFeedback?.type === 'success') {
        setSaveFeedback(null);
      }
    },
    [isGroupClosed, isTeacher, saveFeedback]
  );

  // Navegación ágil por teclado (Enter o Flecha Abajo avanza al siguiente estudiante en la misma columna)
  const handleCellKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, indicator: string) => {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        const colInputs = Array.from(
          document.querySelectorAll<HTMLInputElement>(
            `input[data-indicator="${indicator}"]:not(:disabled)`
          )
        );
        const idx = colInputs.indexOf(e.currentTarget);
        if (idx >= 0 && idx < colInputs.length - 1) {
          colInputs[idx + 1].focus();
          colInputs[idx + 1].select();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const colInputs = Array.from(
          document.querySelectorAll<HTMLInputElement>(
            `input[data-indicator="${indicator}"]:not(:disabled)`
          )
        );
        const idx = colInputs.indexOf(e.currentTarget);
        if (idx > 0) {
          colInputs[idx - 1].focus();
          colInputs[idx - 1].select();
        }
      }
    },
    []
  );

  // Ejecución interna de guardado (POST /api/grades)
  const executeSaveInternal = useCallback(
    async (bypassClearWarning = false): Promise<boolean> => {
      const ws = activeWorkspaceRef.current;
      if (!ws?.unit || !ws?.groupId) {
        setSaveFeedback({
          type: 'error',
          message: 'Debe seleccionar un aula y una unidad didáctica para guardar.',
        });
        return false;
      }

      if (currentGroup?.closed) {
        setSaveFeedback({
          type: 'error',
          message: 'Registro cerrado. Solicite reapertura a dirección.',
        });
        return false;
      }

      const currentCells = cellsStateRef.current;
      const changedRows: GradeRowPayload[] = [];
      let hasClearingRows = false;

      for (const [key, state] of Object.entries(currentCells)) {
        if (state.isDirty) {
          const [enrollmentId, indicator] = key.split('|');
          const isClearing = state.value === null && state.savedValue !== null;
          if (isClearing) hasClearingRows = true;

          changedRows.push({
            enrollmentId,
            indicator,
            value: state.value,
            clear: isClearing,
            rev: state.rev || null,
          });
        }
      }

      if (changedRows.length === 0) {
        setSaveFeedback({
          type: 'success',
          message: 'No hay modificaciones pendientes para guardar.',
        });
        return true;
      }

      // Si hay notas borradas formalmente (desmarcadas) y no se ha confirmado, solicitar confirmación
      if (hasClearingRows && !bypassClearWarning) {
        setPendingClearConfirm(true);
        return false;
      }

      setIsSaving(true);
      setSaveFeedback(null);
      const thisSeq = ++syncSequenceRef.current;

      try {
        const savedRecords = await apiClient.saveGrades({
          groupId: ws.groupId,
          unit: ws.unit,
          rows: changedRows,
        });

        // Recargar opciones y dashboard para actualizar revisiones en SQLite
        await loadOptions();

        // Actualizar estado local sincronizado para limpiar marcas dirty
        setCellsState((prev) => {
          const updated = { ...prev };
          for (const rec of savedRecords) {
            const key = getCellKey(rec.enrollmentId, rec.indicator);
            if (updated[key]) {
              updated[key] = {
                ...updated[key],
                value: rec.value,
                savedValue: rec.value,
                rev: rec.rev,
                isDirty: false,
              };
            }
          }
          return updated;
        });

        if (thisSeq !== syncSequenceRef.current) {
          return true; // Vista obsoleta descartada
        }

        setSaveFeedback({
          type: 'success',
          message: `Guardado en este equipo · ${savedRecords.length} calificación(es) confirmadas en SQLite local.`,
        });
        setPendingClearConfirm(false);
        return true;
      } catch (err: unknown) {
        const apiErr = err as ApiError;
        if (apiErr?.status === 409) {
          // Conflicto de concurrencia: consultar versión fresca del servidor y mostrar resolución
          try {
            const freshDash = await apiClient.getDashboard();
            const freshGrades = freshDash.grades || [];
            const conflicts: GradeConflictItem[] = [];

            for (const row of changedRows) {
              const serverRec = freshGrades.find(
                (g: GradeRecord) =>
                  g.enrollmentId === row.enrollmentId &&
                  g.unit === ws.unit &&
                  g.indicator === row.indicator
              );

              const student = rosterData.find((ro) => ro.enrollment.id === row.enrollmentId)?.student;
              conflicts.push({
                enrollmentId: row.enrollmentId,
                studentName: student?.name || 'Estudiante',
                document: student?.document || 'S/D',
                indicator: row.indicator,
                localValue: row.value,
                serverValue:
                  serverRec && typeof serverRec.value === 'number' && Number.isFinite(serverRec.value)
                    ? serverRec.value
                    : null,
                serverRev: serverRec?.rev || null,
              });
            }

            setConflictItems(conflicts);
          } catch {
            // Si falla la consulta adicional, conservar los cambios locales
          }

          setSaveFeedback({
            type: 'conflict',
            message: `Conflicto de actualización: ${
              apiErr.error || 'Una o más notas fueron modificadas en otra sesión.'
            }`,
          });
        } else {
          setSaveFeedback({
            type: 'error',
            message: apiErr?.error || 'Error al guardar las calificaciones en el servidor local.',
          });
        }
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [currentGroup, loadOptions, rosterData]
  );

  // Descartar cambios locales no guardados y restaurar valores del servidor
  const handleDiscardLocalChanges = useCallback(() => {
    setCellsState((prev) => {
      const restored: Record<string, GradeCellState> = {};
      for (const [key, cell] of Object.entries(prev)) {
        restored[key] = {
          ...cell,
          value: cell.savedValue,
          isDirty: false,
        };
      }
      return restored;
    });
    setSaveFeedback(null);
    setPendingClearConfirm(false);
  }, []);

  // Registrar protección de cambios pendientes
  useEffect(() => {
    if (hasUnsavedChanges) {
      registerPendingChanges({
        id: 'evaluaciones',
        hasChanges: true,
        message:
          'Hay calificaciones de evaluación sin guardar. Si continúa, perderá las modificaciones pendientes.',
        onSave: () => executeSaveInternal(true),
        onDiscard: handleDiscardLocalChanges,
      });
    } else {
      unregisterPendingChanges('evaluaciones');
    }

    return () => {
      unregisterPendingChanges('evaluaciones');
    };
  }, [
    hasUnsavedChanges,
    registerPendingChanges,
    unregisterPendingChanges,
    executeSaveInternal,
    handleDiscardLocalChanges,
  ]);

  // Manejo de resolución de conflictos 409
  const handleConflictKeepLocal = () => {
    setConflictItems(null);
    setSaveFeedback({
      type: 'conflict',
      message: 'Se conservaron las modificaciones locales sin aplicar cambios en el servidor.',
    });
  };

  const handleConflictDiscardAndLoadServer = async () => {
    setIsResolvingConflict(true);
    try {
      await loadOptions();
      const freshDash = await apiClient.getDashboard();
      const freshGrades = freshDash.grades || [];
      const ws = activeWorkspaceRef.current;

      setCellsState((prev) => {
        const next = { ...prev };
        for (const [key, cell] of Object.entries(prev)) {
          const [enrollmentId, indicator] = key.split('|');
          const serverRec = freshGrades.find(
            (g: GradeRecord) =>
              g.enrollmentId === enrollmentId &&
              g.unit === ws?.unit &&
              g.indicator === indicator
          );
          const serverVal =
            serverRec && typeof serverRec.value === 'number' && Number.isFinite(serverRec.value)
              ? serverRec.value
              : null;
          next[key] = {
            ...cell,
            value: serverVal,
            savedValue: serverVal,
            rev: serverRec?.rev,
            isDirty: false,
          };
        }
        return next;
      });

      setConflictItems(null);
      setSaveFeedback({
        type: 'success',
        message: 'Versión del servidor cargada con éxito. Las modificaciones locales fueron descartadas.',
      });
    } catch {
      setSaveFeedback({
        type: 'error',
        message: 'No se pudo sincronizar con la versión del servidor.',
      });
    } finally {
      setIsResolvingConflict(false);
    }
  };

  const handleConflictReapplyWithServerRev = async () => {
    if (!conflictItems || conflictItems.length === 0) return;
    setIsResolvingConflict(true);
    const ws = activeWorkspaceRef.current;
    if (!ws?.unit || !ws?.groupId) return;

    try {
      const rowsToReapply: GradeRowPayload[] = conflictItems.map((c) => ({
        enrollmentId: c.enrollmentId,
        indicator: c.indicator,
        value: c.localValue,
        clear: c.localValue === null,
        rev: c.serverRev,
      }));

      const savedRecords = await apiClient.saveGrades({
        groupId: ws.groupId,
        unit: ws.unit,
        rows: rowsToReapply,
      });

      await loadOptions();

      setCellsState((prev) => {
        const next = { ...prev };
        for (const rec of savedRecords) {
          const key = getCellKey(rec.enrollmentId, rec.indicator);
          if (next[key]) {
            next[key] = {
              ...next[key],
              value: rec.value,
              savedValue: rec.value,
              rev: rec.rev,
              isDirty: false,
            };
          }
        }
        return next;
      });

      setConflictItems(null);
      setSaveFeedback({
        type: 'success',
        message: `Revisión actualizada exitosamente: ${savedRecords.length} calificación(es) confirmadas con la nueva versión del servidor.`,
      });
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setSaveFeedback({
        type: 'error',
        message: `Error al reaplicar: ${apiErr?.error || 'El servidor rechazó la operación.'}`,
      });
    } finally {
      setIsResolvingConflict(false);
    }
  };

  // Pestaña actual y columnas a mostrar
  const currentTabDef = useMemo(() => {
    return EVALUATION_TABS.find((t) => t.id === activeTab) || EVALUATION_TABS[0];
  }, [activeTab]);

  const displayedIndicators = currentTabDef.indicators;

  // Filtrar estudiantes por término de búsqueda
  const filteredRoster = useMemo(() => {
    if (!searchQuery.trim()) return rosterData;
    const query = searchQuery.trim().toLowerCase();
    return rosterData.filter(
      (r) =>
        r.student.name.toLowerCase().includes(query) ||
        r.student.document.toLowerCase().includes(query)
    );
  }, [rosterData, searchQuery]);

  // Métricas y estadísticas rápidas para la pestaña activa
  const metrics = useMemo(() => {
    let graded = 0;
    let pending = 0;
    let approved = 0;
    let failed = 0;

    for (const item of rosterData) {
      for (const ind of displayedIndicators) {
        const key = getCellKey(item.enrollment.id, ind);
        const cell = cellsState[key];
        const val = cell?.value ?? null;

        if (val === null) {
          pending++;
        } else {
          graded++;
          if (val >= 13) approved++;
          else failed++;
        }
      }
    }

    return {
      totalStudents: rosterData.length,
      totalCells: rosterData.length * displayedIndicators.length,
      graded,
      pending,
      approved,
      failed,
    };
  }, [rosterData, displayedIndicators, cellsState]);

  // Descripción o capacidad de la unidad desde document configuration
  const unitDocDetails = useMemo(() => {
    if (!activeWorkspace?.groupId || !activeWorkspace?.unit || !docConfig) return null;
    const unitKey = `unit:${activeWorkspace.groupId}:${activeWorkspace.unit}`;
    const defaults = docConfig.defaults?.[unitKey] || {};
    const setting = docConfig.settings?.find(
      (s) =>
        s.scope.kind === 'unit' &&
        s.scope.target === activeWorkspace.groupId &&
        s.scope.unit === activeWorkspace.unit
    );
    const fields = setting?.fields || {};
    return {
      name: fields.name || defaults.name || activeWorkspace.unitName || activeWorkspace.unit,
      capacity: fields.capacity || defaults.capacity || '',
      indicators: [
        fields.indicator1 || defaults.indicator1 || '',
        fields.indicator2 || defaults.indicator2 || '',
        fields.indicator3 || defaults.indicator3 || '',
        fields.indicator4 || defaults.indicator4 || '',
        fields.indicator5 || defaults.indicator5 || '',
      ],
    };
  }, [activeWorkspace, docConfig]);

  // =========================================================================
  // CONTROL DE WORKSPACE Y CASOS DE BLOQUEO INSTITUCIONAL
  // =========================================================================

  // Caso 1: Cargando datos del workspace
  if (isWorkspaceLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px]">
        <div className="w-9 h-9 border-4 border-[#13594A]/20 border-t-[#13594A] rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-700">Cargando módulo de evaluaciones…</p>
        <span className="text-xs text-slate-500 mt-1">Conectando con el registro académico local</span>
      </div>
    );
  }

  // Caso 2: Sin aula o workspace configurado
  if (!activeWorkspace?.groupId) {
    return (
      <div className="p-6 max-w-5xl mx-auto animate-in fade-in duration-300">
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm text-center max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-[#13594A]/10 text-[#13594A] flex items-center justify-center mx-auto mb-4">
            <EvaluationIcon className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Registro Auxiliar de Evaluación
          </h2>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            Para registrar notas y calificaciones vigesimales, primero debe seleccionar un aula y una
            unidad didáctica autorizada.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (options?.groups?.[0]) {
                  setModalTargetGroup(options.groups[0]);
                  setIsUnitModalOpen(true);
                }
              }}
              className="px-6 py-2.5 rounded-xl bg-[#13594A] text-white font-bold text-xs hover:bg-[#0D382F] transition-all shadow-sm"
            >
              Seleccionar Aula y Unidad
            </button>
          </div>
        </div>

        {modalTargetGroup && (
          <SelectUnitModal
            isOpen={isUnitModalOpen}
            group={modalTargetGroup}
            programName={modalTargetGroup.programId || 'Programa'}
            moduleName={modalTargetGroup.moduleId || 'Módulo'}
            currentUnitCode={activeWorkspace?.unit}
            onClose={() => setIsUnitModalOpen(false)}
            onConfirm={async (group, mode, unitCode) => {
              await selectGroupAndUnit(group, mode, unitCode);
              setIsUnitModalOpen(false);
            }}
          />
        )}
      </div>
    );
  }

  // Caso 3: En modo MODULE (bloqueado según workspace.cjs:14)
  if (activeWorkspace.mode === 'MODULE' || !activeWorkspace.unit) {
    return (
      <div className="p-6 max-w-5xl mx-auto animate-in fade-in duration-300">
        {/* Cabecera institucional */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>Gestión Académica</span>
              <span>/</span>
              <span className="font-semibold text-slate-700">Registro de Evaluaciones</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              Selección de Unidad Didáctica Requerida
            </h1>
          </div>

          <button
            type="button"
            onClick={() => {
              if (modalTargetGroup) setIsUnitModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#13594A] text-white text-xs font-bold hover:bg-[#0D382F] transition-all shadow-sm self-start sm:self-auto"
          >
            <FolderOpenIcon className="w-4 h-4" />
            <span>Seleccionar Unidad Didáctica</span>
          </button>
        </div>

        {/* Tarjeta de bloqueo informativo con mensaje exacto del servidor */}
        <div className="bg-amber-50/70 rounded-3xl p-8 border border-amber-200 text-center max-w-2xl mx-auto shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-amber-950 tracking-tight">
            Seleccione una unidad didáctica para registrar notas o asistencia.
          </h2>
          <p className="text-xs text-amber-800/90 mt-2 leading-relaxed max-w-lg mx-auto">
            El sistema se encuentra en modo de gestión modular. El registro auxiliar de calificaciones
            vigesimales se gestiona individualmente por unidad didáctica curricular para garantizar la
            trazabilidad académica y la emisión oficial de actas.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (modalTargetGroup) setIsUnitModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-[#13594A] text-white font-bold text-xs hover:bg-[#0D382F] transition-all shadow-sm"
            >
              Cambiar a Modo Unidad (UNIT)
            </button>
            <a
              href="#/inicio"
              className="px-5 py-2.5 rounded-xl bg-white text-slate-700 font-semibold text-xs border border-slate-300 hover:bg-slate-50 transition-all"
            >
              Volver al Inicio
            </a>
          </div>
        </div>

        {modalTargetGroup && (
          <SelectUnitModal
            isOpen={isUnitModalOpen}
            group={modalTargetGroup}
            programName={currentGroup?.programId || 'Programa'}
            moduleName={currentGroup?.moduleId || 'Módulo'}
            currentUnitCode={activeWorkspace.unit}
            onClose={() => setIsUnitModalOpen(false)}
            onConfirm={async (group, mode, unitCode) => {
              await selectGroupAndUnit(group, mode, unitCode);
              setIsUnitModalOpen(false);
            }}
          />
        )}
      </div>
    );
  }

  // =========================================================================
  // VISTA PRINCIPAL DEL REGISTRO DE EVALUACIONES (MODO UNIT)
  // =========================================================================

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-in fade-in duration-200">
      {/* 1. Encabezado institucional e información contextual de aula */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <a href="#/inicio" className="hover:text-[#13594A] transition-colors">
              Inicio
            </a>
            <span>/</span>
            <span className="text-slate-700 font-bold">Registro de Evaluaciones</span>
            <span>/</span>
            <span className="text-[#13594A] font-bold">Unidad {activeWorkspace.unit}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#13594A]" />
              {currentGroup?.name || 'Aula Asignada'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#13594A]/10 text-[#13594A]">
              Modo {activeWorkspace.mode} · Unidad {activeWorkspace.unit}
            </span>
            {isGroupClosed && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                Registro Cerrado (Solo Lectura)
              </span>
            )}
          </div>

          <p className="text-xs text-slate-600">
            {activeWorkspace.unitName
              ? `${activeWorkspace.unit}: ${activeWorkspace.unitName}`
              : `Unidad Didáctica Curricular ${activeWorkspace.unit}`}
            {' · '}
            <span className="font-semibold text-slate-700">
              Escala vigesimal (0 a 20) · Criterios normados por el MINEDU
            </span>
          </p>
        </div>

        {/* Acciones de cabecera */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              requestSafeTransition(() => {
                if (modalTargetGroup) setIsUnitModalOpen(true);
              });
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13594A]"
            title="Cambiar a otra aula o unidad didáctica"
          >
            <FolderOpenIcon className="w-4 h-4 text-slate-600" />
            <span>Cambiar Aula / Unidad</span>
          </button>

          <a
            href="#/documentos"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13594A]"
            title="Ver actas y documentos oficiales"
          >
            <span>Ver Documento</span>
            <ArrowForwardIcon className="w-3 h-3 text-slate-500" />
          </a>
        </div>
      </div>

      {/* 2. Banner de advertencia si el grupo está cerrado */}
      {isGroupClosed && (
        <div
          role="alert"
          className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 text-rose-900 shadow-sm"
        >
          <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div className="flex-1 text-xs">
            <strong className="font-bold block text-sm">Registro académico cerrado</strong>
            <span>Registro cerrado. Solicite reapertura a dirección para modificar calificaciones.</span>
          </div>
        </div>
      )}

      {/* 3. Panel de navegación por pestañas de indicadores y resumen estadístico */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
        {/* Pestañas de indicadores */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div
            role="tablist"
            aria-label="Indicador a evaluar"
            className="flex flex-wrap items-center gap-1.5"
          >
            {EVALUATION_TABS.map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  type="button"
                  id={`grade-tab-${tab.id}`}
                  data-grade-tab={tab.id}
                  aria-selected={isSelected}
                  aria-controls={`tabpanel-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13594A] ${
                    isSelected
                      ? 'bg-[#13594A] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900'
                  }`}
                >
                  {tab.name}
                </button>
              );
            })}
          </div>

          {/* Buscador de estudiantes */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar estudiante o DNI…"
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#13594A]"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-2.5 top-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35" />
            </svg>
          </div>
        </div>

        {/* Guía contextual del indicador seleccionado */}
        <div className="bg-[#F6F8FA] rounded-2xl p-3.5 border border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="font-bold text-slate-900 block">
              {activeTab === 6
                ? 'Resultado de la Unidad Didáctica (Logro UD)'
                : activeTab === 0
                ? 'Matriz Completa de Evaluación (26 Columnas)'
                : `Indicador de Logro ${activeTab}`}
            </span>
            <p className="text-slate-600">
              {activeTab === 6
                ? 'Confirma el resultado final de la unidad según los criterios institucionales. El sistema no inventa promedios ni calificaciones.'
                : activeTab === 0
                ? 'Vista completa del formato. Puede volver a un indicador específico en cualquier momento sin perder sus calificaciones.'
                : unitDocDetails?.indicators?.[activeTab - 1]
                ? `Criterio oficial: ${unitDocDetails.indicators[activeTab - 1]}`
                : `IA1, IA2 e IA3: instrumentos de evaluación · IL: calificación del indicador · R: recuperación (si corresponde).`}
            </p>
          </div>

          {/* Tarjetas de estadísticas de la pestaña */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Aprobados</span>
              <span className="text-xs font-black text-emerald-700">{metrics.approved}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Desaprobados</span>
              <span className="text-xs font-black text-rose-700">{metrics.failed}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Pendientes</span>
              <span className="text-xs font-black text-slate-600">{metrics.pending}</span>
            </div>
          </div>
        </div>

        {/* Barra de acción: Guardar y estado de cambios */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-3">
            {isTeacher && !isGroupClosed && (
              <button
                type="button"
                id="save-academic"
                onClick={() => executeSaveInternal(false)}
                disabled={isSaving || !hasUnsavedChanges}
                className="px-5 py-2.5 rounded-xl bg-[#13594A] hover:bg-[#0D382F] text-white text-xs font-bold transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13594A] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Guardando matriz…</span>
                  </>
                ) : (
                  <>
                    <EvaluationIcon className="w-4 h-4" />
                    <span>Guardar matriz ({dirtyCount})</span>
                  </>
                )}
              </button>
            )}

            {hasUnsavedChanges && (
              <button
                type="button"
                onClick={handleDiscardLocalChanges}
                disabled={isSaving}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                Descartar cambios
              </button>
            )}

            <span
              id="save-state"
              className={`text-xs font-semibold ${
                hasUnsavedChanges ? 'text-amber-800' : 'text-slate-500'
              }`}
            >
              {hasUnsavedChanges
                ? `● ${dirtyCount} celda(s) con cambios pendientes de guardar`
                : 'Sin cambios pendientes.'}
            </span>
          </div>

          {/* Leyenda visual rápida */}
          <div className="flex items-center gap-3 text-[11px] text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-400" />
              <span>Aprobado (≥ 13)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-100 border border-rose-400" />
              <span>Desaprobado (&lt; 13)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-white border border-slate-300" />
              <span>Pendiente (vacío)</span>
            </span>
          </div>
        </div>

        {/* Mensaje de feedback tras guardar o ante errores */}
        {saveFeedback && (
          <div
            role="status"
            className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
              saveFeedback.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                : saveFeedback.type === 'conflict'
                ? 'bg-amber-50 border border-amber-200 text-amber-900'
                : 'bg-rose-50 border border-rose-200 text-rose-900'
            }`}
          >
            <span>{saveFeedback.message}</span>
            <button
              type="button"
              onClick={() => setSaveFeedback(null)}
              className="text-slate-400 hover:text-slate-600 p-1"
              aria-label="Cerrar notificación"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* 4. Tabla de calificaciones (Matriz con soporte de navegación horizontal y sticky) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[700px]">
          <table
            className="w-full text-left text-xs border-collapse grade-matrix"
            aria-label="Tabla de registro de evaluaciones"
          >
            {/* Cabecera de la tabla */}
            <thead className="bg-[#F6F8FA] sticky top-0 z-20 border-b border-slate-200 text-slate-700 uppercase font-black tracking-wider text-[11px]">
              {/* Si es pestaña completa (activeTab === 0), cabecera multinivel */}
              {activeTab === 0 ? (
                <>
                  <tr className="border-b border-slate-200">
                    <th
                      rowSpan={2}
                      className="py-3 px-4 sticky left-0 z-30 bg-[#F6F8FA] border-r border-slate-200 min-w-[240px] shadow-sm"
                    >
                      Estudiante
                    </th>
                    <th colSpan={5} className="py-2.5 px-3 text-center border-r border-slate-200 bg-[#E8F0EE] text-[#13594A]">
                      Indicador de Logro 1
                    </th>
                    <th colSpan={5} className="py-2.5 px-3 text-center border-r border-slate-200 bg-[#E8F0EE] text-[#13594A]">
                      Indicador de Logro 2
                    </th>
                    <th colSpan={5} className="py-2.5 px-3 text-center border-r border-slate-200 bg-[#E8F0EE] text-[#13594A]">
                      Indicador de Logro 3
                    </th>
                    <th colSpan={5} className="py-2.5 px-3 text-center border-r border-slate-200 bg-[#E8F0EE] text-[#13594A]">
                      Indicador de Logro 4
                    </th>
                    <th colSpan={5} className="py-2.5 px-3 text-center border-r border-slate-200 bg-[#E8F0EE] text-[#13594A]">
                      Indicador de Logro 5
                    </th>
                    <th rowSpan={2} className="py-3 px-4 text-center bg-emerald-50 text-emerald-900 border-l border-slate-200 min-w-[90px]">
                      Logro UD
                    </th>
                  </tr>
                  <tr>
                    {Array.from({ length: 5 }).map((_, gIdx) => (
                      <React.Fragment key={gIdx}>
                        <th className="py-2 px-2 text-center min-w-[65px] border-r border-slate-200 font-bold">IA1</th>
                        <th className="py-2 px-2 text-center min-w-[65px] border-r border-slate-200 font-bold">IA2</th>
                        <th className="py-2 px-2 text-center min-w-[65px] border-r border-slate-200 font-bold">IA3</th>
                        <th className="py-2 px-2 text-center min-w-[70px] border-r border-slate-200 font-black text-[#13594A] bg-[#E8F0EE]/40">IL</th>
                        <th className="py-2 px-2 text-center min-w-[65px] border-r border-slate-200 font-bold text-amber-900">R</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </>
              ) : (
                /* Cabecera para pestañas individuales (Indicadores 1..5 o Resultado UD) */
                <tr>
                  <th className="py-3.5 px-4 sticky left-0 z-30 bg-[#F6F8FA] border-r border-slate-200 min-w-[280px] shadow-sm">
                    Estudiante ({filteredRoster.length})
                  </th>
                  {displayedIndicators.map((ind) => {
                    const info = getIndicatorHeaderInfo(ind);
                    return (
                      <th
                        key={ind}
                        className={`py-3.5 px-3 text-center min-w-[90px] border-r border-slate-200 ${
                          ind === 'RESULTADO_UD'
                            ? 'bg-emerald-50/70 text-emerald-950 font-black'
                            : ind.endsWith('.RECOVERY')
                            ? 'bg-amber-50/50 text-amber-900'
                            : !ind.includes('.')
                            ? 'bg-[#13594A]/10 text-[#13594A] font-black'
                            : ''
                        }`}
                        title={info.title}
                      >
                        <div className="flex flex-col items-center">
                          <span className="font-black text-xs">{info.code}</span>
                          <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-tighter">
                            {info.typeBadge}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              )}
            </thead>

            {/* Cuerpo de la tabla */}
            <tbody id="academic-rows" className="divide-y divide-slate-100">
              {filteredRoster.length === 0 ? (
                <tr>
                  <td
                    colSpan={displayedIndicators.length + 1}
                    className="py-12 text-center text-slate-500 text-xs italic"
                  >
                    {searchQuery
                      ? 'No se encontraron estudiantes que coincidan con la búsqueda.'
                      : 'No hay matrículas activas en esta aula.'}
                  </td>
                </tr>
              ) : (
                filteredRoster.map((item, rowIdx) => {
                  const enId = item.enrollment.id;
                  const studentName = item.student.name;
                  const doc = item.student.document;

                  return (
                    <tr
                      key={enId}
                      data-enrollment={enId}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Columna Estudiante (Sticky) */}
                      <td className="py-2.5 px-4 sticky left-0 z-10 bg-white border-r border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2.5">
                          <span className="text-[10px] font-mono text-slate-600 font-bold w-5 shrink-0">
                            {rowIdx + 1}.
                          </span>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 block truncate text-xs">
                              {studentName}
                            </span>
                            <span className="text-[10px] text-slate-600 font-mono">
                              DNI: {doc}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Celdas de calificación para los indicadores visibles */}
                      {displayedIndicators.map((ind) => {
                        const cellKey = getCellKey(enId, ind);
                        const cellState = cellsState[cellKey];
                        const val = cellState?.value ?? null;
                        const isDirty = cellState?.isDirty ?? false;

                        // Clases según la escala vigesimal
                        let scoreColorClass = 'text-slate-800 border-slate-200 bg-white';
                        if (val !== null) {
                          if (val >= 13) {
                            scoreColorClass =
                              'text-emerald-900 font-bold bg-emerald-50/70 border-emerald-300';
                          } else {
                            scoreColorClass =
                              'text-rose-900 font-bold bg-rose-50/70 border-rose-300';
                          }
                        }

                        const inputId = `score-${enId}-${ind}`;

                        return (
                          <td
                            key={ind}
                            className={`py-1.5 px-2 text-center border-r border-slate-100 ${
                              isDirty ? 'bg-amber-50/40' : ''
                            }`}
                          >
                            <div className="relative inline-block w-full max-w-[80px]">
                              <input
                                id={inputId}
                                type="number"
                                min="0"
                                max="20"
                                step="0.01"
                                data-indicator={ind}
                                value={val === null ? '' : val}
                                onChange={(e) => handleCellChange(enId, ind, e.target.value)}
                                onKeyDown={(e) => handleCellKeyDown(e, ind)}
                                disabled={!isTeacher || isGroupClosed || !activeWorkspace.unit}
                                aria-label={`${ind} de ${studentName}`}
                                placeholder="—"
                                className={`w-full py-1.5 px-2 text-center text-xs rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-[#13594A] ${scoreColorClass} ${
                                  isDirty ? 'ring-2 ring-amber-400 border-amber-500' : ''
                                } disabled:opacity-60 disabled:cursor-not-allowed`}
                              />
                              {isDirty && (
                                <span
                                  className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white"
                                  title="Calificación modificada sin guardar"
                                />
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Modal de Selección de Aula y Unidad */}
      {modalTargetGroup && (
        <SelectUnitModal
          isOpen={isUnitModalOpen}
          group={modalTargetGroup}
          programName={currentGroup?.programId || 'Programa'}
          moduleName={currentGroup?.moduleId || 'Módulo'}
          currentUnitCode={activeWorkspace.unit}
          onClose={() => setIsUnitModalOpen(false)}
          onConfirm={async (group, mode, unitCode) => {
            await selectGroupAndUnit(group, mode, unitCode);
            setIsUnitModalOpen(false);
          }}
        />
      )}

      {/* 6. Modal de Confirmación para Calificaciones Borradas (clear: true) */}
      {pendingClearConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-dialog-title"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 id="clear-dialog-title" className="text-base font-bold text-slate-900 text-center">
              ¿Confirmar notas que quedarán pendientes?
            </h3>
            <p className="text-xs text-slate-600 mt-2 text-center leading-relaxed">
              Algunas notas quedarán pendientes. Se conserva su historial en la base de datos de auditoría.
              ¿Desea continuar y guardar los cambios?
            </p>
            <div className="mt-6 flex gap-2.5 justify-end">
              <button
                type="button"
                onClick={() => setPendingClearConfirm(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setPendingClearConfirm(false);
                  executeSaveInternal(true);
                }}
                className="px-4 py-2 rounded-xl bg-[#13594A] text-white text-xs font-bold hover:bg-[#0D382F] transition-colors shadow-sm"
              >
                Confirmar y Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal Accesible de Resolución de Conflictos HTTP 409 */}
      {conflictItems && conflictItems.length > 0 && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="conflict-dialog-title"
          aria-describedby="conflict-dialog-desc"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-purple-200 flex flex-col max-h-[90vh]">
            <div className="flex items-start gap-4 mb-4 pb-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 id="conflict-dialog-title" className="text-lg font-bold text-slate-900 tracking-tight">
                  Conflicto de actualización — Calificación modificada en otra sesión
                </h3>
                <p id="conflict-dialog-desc" className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Uno o más registros fueron modificados en otra sesión o equipo. A continuación puede
                  consultar la versión del servidor y compararla con sus notas locales:
                </p>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 my-2 border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Estudiante</th>
                    <th className="py-2.5 px-3">Criterio</th>
                    <th className="py-2.5 px-3">Modificación local</th>
                    <th className="py-2.5 px-3">Versión en servidor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {conflictItems.map((c) => (
                    <tr key={`${c.enrollmentId}-${c.indicator}`} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-900 block">{c.studentName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">DNI: {c.document}</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                        {c.indicator}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded text-[11px]">
                          {c.localValue !== null ? `Nota: ${c.localValue}` : 'Pendiente (Borrada)'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                          {c.serverValue !== null ? `Nota: ${c.serverValue}` : 'Sin registrar'}
                        </span>
                        <span className="block text-[9px] text-slate-600 font-mono mt-0.5">
                          Rev: {c.serverRev || 'null'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleConflictKeepLocal}
                disabled={isResolvingConflict}
                className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors text-center disabled:opacity-50"
              >
                Conservar notas locales (sin enviar)
              </button>

              <button
                type="button"
                onClick={handleConflictDiscardAndLoadServer}
                disabled={isResolvingConflict}
                className="px-4 py-2.5 rounded-xl border border-purple-300 bg-purple-50 text-purple-900 text-xs font-bold hover:bg-purple-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 transition-colors text-center disabled:opacity-50"
              >
                Descartar notas y cargar servidor
              </button>

              <button
                type="button"
                onClick={handleConflictReapplyWithServerRev}
                disabled={isResolvingConflict}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#13594A] text-white text-xs font-bold hover:bg-[#0D382F] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 transition-colors text-center shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isResolvingConflict ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Reaplicando…</span>
                  </>
                ) : (
                  <span>Reaplicar con revisión vigente</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistroEvaluaciones;
