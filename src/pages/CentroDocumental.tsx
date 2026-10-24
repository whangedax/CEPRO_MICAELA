/**
 * pages/CentroDocumental.tsx
 * 
 * Centro Oficial de Documentos Académicos — CEPRO_MICAELA 2.0.
 * Conectado en tiempo real con el backend Node.js:
 * - GET /api/document/configuration (catálogo y esquemas de 21 plantillas)
 * - POST /api/document (validación preflight oficial del motor de documentos)
 * - POST /api/document/pdf (generación binaria PDF mediante motor institucional)
 * - POST /api/attendance/simulate-unit & clear-unit (simulación demostrativa)
 * 
 * Tarea 19:
 * - Catálogo completo de las 21 plantillas oficiales (TMPL-01 a TMPL-21).
 * - Identificación y requisitos precisos por formato, ámbito y rol.
 * - Validación preflight oficial: comprobación de campos completos y faltantes.
 * - Visualizador PDF integrado con PDF.js (páginas, zoom, ajuste de ancho, descarga).
 * - Adaptación inteligente de workspace (UNIT vs MODULE vs PRACTICE).
 * - Modo demostración con aviso reglamentario: "ENTORNO DE PRUEBAS SIN VALIDEZ OFICIAL".
 * - Cumplimiento estricto del estándar Google Stitch (#13594A, #F6F8FA) y WCAG 2.2 AA.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import apiClient from '../api/client';
import {
  DocumentConfigurationResponse,
  DocumentCatalogItem,
  DocumentPreflightResponse,
  WorkspaceGroupOption,
  StudentEnrollmentItem,
  StudentItem,
  ApiError,
} from '../api/types';
import {
  OFFICIAL_TEMPLATES,
  TemplateMetadata,
  TemplateCategory,
  TEMPLATE_CATEGORIES,
  getTemplateById,
} from '../utils/documentTemplates';
import { SelectUnitModal } from '../components/academic/SelectUnitModal';
import { PdfViewer } from '../components/ui/PdfViewer';
import {
  DocumentIcon,
  EvaluationIcon,
  AttendanceIcon,
  FolderOpenIcon,
  ArrowForwardIcon,
  DocConfigIcon,
} from '../components/ui/Icons';

export const CentroDocumental: React.FC = () => {
  const { user, systemStatus } = useAuth();
  const {
    activeWorkspace,
    dashboardData,
    options,
    isLoading: isWorkspaceLoading,
    selectGroupAndUnit,
  } = useWorkspace();

  // Configuración documental institucional desde backend
  const [docConfig, setDocConfig] = useState<DocumentConfigurationResponse | null>(null);
  const [isConfigLoading, setIsConfigLoading] = useState<boolean>(true);

  // Filtros del catálogo
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Parámetros de selección del documento
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('TMPL-05');
  const [selectedUnit, setSelectedUnit] = useState<string>('UD1');
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string>('');
  const [includeRetired, setIncludeRetired] = useState<boolean>(false);
  const [demoFill, setDemoFill] = useState<boolean>(false);

  // Estados de preflight y generación de PDF
  const [isPreflighting, setIsPreflighting] = useState<boolean>(false);
  const [preflightDoc, setPreflightDoc] = useState<DocumentPreflightResponse | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  // Mensajes de retroalimentación
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);

  // Estado para simulación de asistencia en modo demo
  const [isSimulatingAttendance, setIsSimulatingAttendance] = useState<boolean>(false);

  // Modal para cambiar aula o unidad
  const [isUnitModalOpen, setIsUnitModalOpen] = useState<boolean>(false);
  const [modalTargetGroup, setModalTargetGroup] = useState<WorkspaceGroupOption | null>(null);

  // Secuencia para descarte de respuestas obsoletas
  const requestSeqRef = useRef<number>(0);

  // 1. Cargar configuración documental oficial desde el backend
  const loadConfiguration = useCallback(async () => {
    setIsConfigLoading(true);
    try {
      const cfg = await apiClient.getDocumentConfiguration();
      setDocConfig(cfg);
    } catch (err: unknown) {
      console.warn('No se pudo cargar la configuración documental:', err);
    } finally {
      setIsConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfiguration();
  }, [loadConfiguration, activeWorkspace]);

  // Identificar grupo activo
  const currentGroup = useMemo(() => {
    if (!dashboardData?.groups || !activeWorkspace?.groupId) return null;
    return (
      dashboardData.groups.find((g) => g.id === activeWorkspace.groupId) ||
      dashboardData.groups[0] ||
      null
    );
  }, [dashboardData, activeWorkspace]);

  // Unidades disponibles en el aula actual (excluyendo EFSRT para materias ordinarias)
  const availableUnits = useMemo(() => {
    if (!currentGroup?.units) return [];
    return currentGroup.units.filter((u) => u !== 'EFSRT');
  }, [currentGroup]);

  // Sincronizar grupo para el modal
  useEffect(() => {
    if (options?.groups && activeWorkspace?.groupId) {
      const match = options.groups.find((g) => g.id === activeWorkspace.groupId);
      if (match) setModalTargetGroup(match);
      else if (options.groups.length > 0) setModalTargetGroup(options.groups[0]);
    } else if (options?.groups?.length) {
      setModalTargetGroup(options.groups[0]);
    }
  }, [options, activeWorkspace]);

  // Lista de matrículas del grupo activo para formatos individuales (TMPL-02, TMPL-20, TMPL-21)
  const rosterEnrollments = useMemo(() => {
    if (!dashboardData?.enrollments || !dashboardData?.students || !activeWorkspace?.groupId) {
      return [];
    }

    const studentsMap = new Map<string, StudentItem>();
    for (const s of dashboardData.students) {
      studentsMap.set(s.id, s);
    }

    const enrollments = dashboardData.enrollments.filter(
      (e: StudentEnrollmentItem) =>
        e.groupId === activeWorkspace.groupId && (includeRetired ? true : e.active)
    );

    const list = enrollments.map((en: StudentEnrollmentItem) => {
      const s = studentsMap.get(en.studentId);
      return {
        id: en.id,
        studentId: en.studentId,
        name: s?.name || en.code || en.id,
        document: s?.document || 'S/D',
        active: en.active,
      };
    });

    list.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    return list;
  }, [dashboardData, activeWorkspace, includeRetired]);

  // Sincronizar unidad y estudiante por defecto al cambiar de grupo o unidad
  useEffect(() => {
    if (activeWorkspace?.unit && availableUnits.includes(activeWorkspace.unit)) {
      setSelectedUnit(activeWorkspace.unit);
    } else if (availableUnits.length > 0) {
      setSelectedUnit(availableUnits[0]);
    }
  }, [activeWorkspace, availableUnits]);

  useEffect(() => {
    if (rosterEnrollments.length > 0 && !selectedEnrollmentId) {
      setSelectedEnrollmentId(rosterEnrollments[0].id);
    }
  }, [rosterEnrollments, selectedEnrollmentId]);

  // Metadatos de la plantilla actualmente seleccionada
  const activeTemplateMeta = useMemo(() => {
    return getTemplateById(selectedTemplateId) || OFFICIAL_TEMPLATES[0];
  }, [selectedTemplateId]);

  // Plantillas permitidas según el backend y el rol del usuario
  const allowedTemplateIds = useMemo(() => {
    if (docConfig?.catalog?.length) {
      return new Set(docConfig.catalog.map((t: DocumentCatalogItem) => t.id));
    }
    // Fallback basado en roles institucionales
    return new Set(
      OFFICIAL_TEMPLATES.filter((t) =>
        user?.role ? t.rolesAllowed.includes(user.role) : false
      ).map((t) => t.id)
    );
  }, [docConfig, user]);

  // Filtrado de las 21 plantillas del catálogo
  const filteredCatalog = useMemo(() => {
    return OFFICIAL_TEMPLATES.filter((tmpl) => {
      // Filtro por categoría
      if (selectedCategory !== 'TODOS' && tmpl.category !== selectedCategory) {
        return false;
      }
      // Filtro por texto de búsqueda
      if (searchFilter.trim()) {
        const query = searchFilter.trim().toLowerCase();
        const matchesName = tmpl.name.toLowerCase().includes(query);
        const matchesId = tmpl.id.toLowerCase().includes(query);
        const matchesDesc = tmpl.description.toLowerCase().includes(query);
        if (!matchesName && !matchesId && !matchesDesc) {
          return false;
        }
      }
      return true;
    });
  }, [selectedCategory, searchFilter]);

  // Comprobar compatibilidad con el modo de workspace actual
  const isWorkspaceModeCompatible = useMemo(() => {
    if (!activeWorkspace?.mode) return true;
    const reqMode = activeTemplateMeta.requiredMode;
    if (activeWorkspace.mode === reqMode) return true;
    // Si la plantilla requiere UNIT pero estamos en MODULE, o viceversa
    return false;
  }, [activeWorkspace, activeTemplateMeta]);

  // 2. Ejecutar validación preflight oficial (POST /api/document)
  const executePreflight = useCallback(
    async (targetTemplateId = selectedTemplateId, targetUnit = selectedUnit) => {
      if (!activeWorkspace?.groupId) return null;

      setIsPreflighting(true);
      setFeedback(null);
      const thisSeq = ++requestSeqRef.current;

      try {
        const payload = {
          groupId: activeWorkspace.groupId,
          templateId: targetTemplateId,
          includeRetired,
          demoFill,
          ...(activeTemplateMeta.scope === 'Unidad' ? { unit: targetUnit } : {}),
          ...(activeTemplateMeta.isIndividual && selectedEnrollmentId
            ? { enrollmentId: selectedEnrollmentId }
            : {}),
        };

        const result = await apiClient.getDocumentPreflight(payload);

        if (thisSeq !== requestSeqRef.current) return null;

        setPreflightDoc(result);

        if (result.preflight?.complete) {
          setFeedback({
            type: 'success',
            message: 'Parámetros completos. El formato cumple los requisitos oficiales para emisión.',
          });
        } else {
          setFeedback({
            type: 'warning',
            message: `El documento cuenta con ${result.preflight?.missing?.length || 0} parámetro(s) pendientes. Puede generar la vista previa, pero la emisión oficial requiere completarlos.`,
          });
        }

        return result;
      } catch (err: unknown) {
        if (thisSeq !== requestSeqRef.current) return null;
        const apiErr = err as ApiError;
        setPreflightDoc(null);
        setFeedback({
          type: 'error',
          message: apiErr?.error || 'Error al validar los parámetros del documento en el servidor.',
        });
        return null;
      } finally {
        setIsPreflighting(false);
      }
    },
    [
      activeWorkspace,
      selectedTemplateId,
      selectedUnit,
      selectedEnrollmentId,
      includeRetired,
      demoFill,
      activeTemplateMeta,
    ]
  );

  // 3. Generar archivo binario PDF mediante el motor original (POST /api/document/pdf)
  const handleGeneratePdf = async () => {
    if (!activeWorkspace?.groupId) {
      setFeedback({
        type: 'error',
        message: 'Debe seleccionar un aula autorizada para generar el documento.',
      });
      return;
    }

    // Si aún no tenemos preflight o cambiaron parámetros, ejecutar preflight primero
    let currentPreflight = preflightDoc;
    if (!currentPreflight || currentPreflight.templateId !== selectedTemplateId) {
      currentPreflight = await executePreflight();
      if (!currentPreflight) return;
    }

    setIsGeneratingPdf(true);
    setFeedback(null);
    const thisSeq = ++requestSeqRef.current;

    try {
      const payload = {
        groupId: activeWorkspace.groupId,
        templateId: selectedTemplateId,
        includeRetired,
        demoFill,
        fingerprint: currentPreflight.fingerprint,
        ...(activeTemplateMeta.scope === 'Unidad' ? { unit: selectedUnit } : {}),
        ...(activeTemplateMeta.isIndividual && selectedEnrollmentId
          ? { enrollmentId: selectedEnrollmentId }
          : {}),
      };

      const blob = await apiClient.getDocumentPdf(payload);

      if (thisSeq !== requestSeqRef.current) return;

      setPdfBlob(blob);

      setFeedback({
        type: 'success',
        message: `PDF generado con éxito mediante el motor institucional CEPRO_MICAELA 2.0 (${(blob.size / 1024).toFixed(1)} KB).`,
      });
    } catch (err: unknown) {
      if (thisSeq !== requestSeqRef.current) return;
      const apiErr = err as ApiError;
      if (apiErr?.status === 409) {
        setFeedback({
          type: 'error',
          message: 'Los datos académicos cambiaron en el servidor. Actualice la verificación preflight antes de generar el PDF.',
        });
      } else {
        setFeedback({
          type: 'error',
          message: apiErr?.error || 'Error al generar el archivo PDF en el servidor local.',
        });
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // 4. Cambiar de plantilla seleccionada
  const handleSelectTemplate = (tmpl: TemplateMetadata) => {
    if (tmpl.id === selectedTemplateId) {
      // Si la plantilla ya está seleccionada y no tiene preflight, reintentarlo
      if (!preflightDoc && !isPreflighting) {
        executePreflight(tmpl.id, selectedUnit);
      }
      return;
    }

    setSelectedTemplateId(tmpl.id);
    setPdfBlob(null);
    setPreflightDoc(null);
    setFeedback(null);

    // Ajustar unidad por defecto según la plantilla
    if (tmpl.scope === 'Unidad' && typeof tmpl.targetUnitIndex === 'number') {
      const targetUnit = availableUnits[tmpl.targetUnitIndex] || availableUnits[0] || 'UD1';
      setSelectedUnit(targetUnit);
    }
  };

  // Ejecutar preflight automáticamente al seleccionar plantilla o cambiar de unidad/estudiante
  useEffect(() => {
    if (activeWorkspace?.groupId && isWorkspaceModeCompatible) {
      executePreflight(selectedTemplateId, selectedUnit);
    }
  }, [
    activeWorkspace,
    selectedTemplateId,
    selectedUnit,
    selectedEnrollmentId,
    includeRetired,
    demoFill,
    isWorkspaceModeCompatible,
    executePreflight,
  ]);

  // 5. Simular asistencia en modo demo para formatos de asistencia (TMPL-05..10)
  const handleSimulateAttendance = async () => {
    if (!activeWorkspace?.groupId || !selectedUnit) return;
    setIsSimulatingAttendance(true);
    try {
      const res = await apiClient.simulateUnitAttendance({
        groupId: activeWorkspace.groupId,
        unit: selectedUnit,
        mode: 'realistic',
      });
      setFeedback({
        type: 'success',
        message: `Simulación completada: ${res.datesCount} fechas lectivas (${res.recordsCount} marcas) para ${res.studentsCount} estudiantes.`,
      });
      // Actualizar preflight y regenerar PDF
      await executePreflight();
      await handleGeneratePdf();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setFeedback({
        type: 'error',
        message: apiErr?.error || 'No se pudo simular la asistencia.',
      });
    } finally {
      setIsSimulatingAttendance(false);
    }
  };

  // Limpiar asistencia simulada
  const handleClearSimulatedAttendance = async () => {
    if (!activeWorkspace?.groupId || !selectedUnit) return;
    setIsSimulatingAttendance(true);
    try {
      const res = await apiClient.clearUnitAttendance({
        groupId: activeWorkspace.groupId,
        unit: selectedUnit,
      });
      setFeedback({
        type: 'success',
        message: `Asistencia limpiada: ${res.clearedCount} marcas removidas de la unidad.`,
      });
      await executePreflight();
      await handleGeneratePdf();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setFeedback({
        type: 'error',
        message: apiErr?.error || 'No se pudo limpiar la asistencia.',
      });
    } finally {
      setIsSimulatingAttendance(false);
    }
  };

  // Cambiar modo de workspace rápidamente
  const handleSwitchWorkspaceMode = async (targetMode: 'UNIT' | 'MODULE' | 'PRACTICE') => {
    const wsGroup =
      options?.groups?.find((g) => g.id === activeWorkspace?.groupId) || modalTargetGroup;
    if (!wsGroup) return;
    try {
      const unitCode = targetMode === 'UNIT' ? availableUnits[0] || 'UD1' : undefined;
      await selectGroupAndUnit(wsGroup, targetMode, unitCode);
      setFeedback({
        type: 'success',
        message: `Espacio de trabajo cambiado a modo ${targetMode}.`,
      });
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setFeedback({
        type: 'error',
        message: apiErr?.error || 'No se pudo cambiar el espacio de trabajo.',
      });
    }
  };

  // Nombre de archivo sugerido para descarga
  const suggestedFilename = useMemo(() => {
    const groupName = currentGroup?.id || 'GRUPO';
    const unitPart = activeTemplateMeta.scope === 'Unidad' ? `_${selectedUnit}` : '';
    const isDemo = demoFill || systemStatus?.demonstration === true;
    const statusPart = isDemo
      ? '_DEMOSTRACION'
      : (!preflightDoc?.preflight?.complete ? '_BORRADOR' : '_COMPLETADO');
    return `${activeTemplateMeta.id}_${groupName}${unitPart}${statusPart}.pdf`;
  }, [activeTemplateMeta, currentGroup, selectedUnit, demoFill, systemStatus, preflightDoc]);

  // =========================================================================
  // CASO DE ESPERA: CARGA INICIAL
  // =========================================================================

  if (isWorkspaceLoading || isConfigLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[420px]">
        <div className="w-10 h-10 border-4 border-[#13594A]/20 border-t-[#13594A] rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-800">Cargando Centro de Documentos Académicos…</p>
        <span className="text-xs text-slate-500 mt-1">
          Consultando catálogo de 21 plantillas oficiales y motor PDF local
        </span>
      </div>
    );
  }

  // =========================================================================
  // CASO 1: SIN ESPACIO DE TRABAJO CONFIGURADO
  // =========================================================================

  if (!activeWorkspace?.groupId) {
    return (
      <div className="p-6 max-w-5xl mx-auto animate-in fade-in duration-300">
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm text-center max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-[#13594A]/10 text-[#13594A] flex items-center justify-center mx-auto mb-4">
            <DocumentIcon className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Centro de Documentos Académicos
          </h2>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            Para consultar las 21 plantillas oficiales, validar requisitos preflight y generar
            documentos en PDF con el motor institucional, seleccione primero un aula y unidad.
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
              Seleccionar Aula y Espacio
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

  // =========================================================================
  // PANTALLA PRINCIPAL DEL CENTRO DOCUMENTAL
  // =========================================================================

  const isAttendanceTemplate =
    activeTemplateMeta.number >= 5 && activeTemplateMeta.number <= 10;
  const isDemoActive = demoFill || systemStatus?.demonstration === true;

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-200">
      {/* 1. Encabezado institucional y contexto activo */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <a href="#/inicio" className="hover:text-[#13594A] transition-colors">
              Inicio
            </a>
            <span>/</span>
            <span className="text-slate-700 font-bold">Documentos</span>
            <span>/</span>
            <span className="text-[#13594A] font-bold">Catálogo Oficial de 21 Formatos</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#13594A]" />
              Centro de Documentos Académicos
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#13594A]/10 text-[#13594A]">
              Aula: {currentGroup?.name || 'Aula Asignada'} · Modo {activeWorkspace.mode}
              {activeWorkspace.unit ? ` (${activeWorkspace.unit})` : ''}
            </span>
            {isDemoActive && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 uppercase tracking-wider">
                Entorno de Pruebas · Sin Validez Oficial
              </span>
            )}
          </div>

          <p className="text-xs text-slate-600">
            Emisión y verificación de los 21 formatos normados por el MINEDU · Generación mediante el
            motor PDF oficial de CEPRO_MICAELA 2.0
          </p>
        </div>

        {/* Acciones de cabecera y enlaces rápidos */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              if (modalTargetGroup) setIsUnitModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13594A]"
            title="Cambiar aula o unidad activa"
          >
            <FolderOpenIcon className="w-4 h-4 text-slate-600" />
            <span>Cambiar Aula / Unidad</span>
          </button>

          <a
            href="#/configuracion-documental"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13594A]"
            title="Consultar datos institucionales y parámetros de las unidades"
          >
            <DocConfigIcon className="w-4 h-4 text-slate-600" />
            <span>Configurar Parámetros</span>
          </a>
        </div>
      </div>

      {/* 2. Banner de advertencia de modo de workspace incompatible */}
      {!isWorkspaceModeCompatible && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="text-xs">
              <strong className="font-bold text-sm block">
                Plantilla requiere modo {activeTemplateMeta.requiredMode}
              </strong>
              <span>
                La plantilla seleccionada (<strong>{activeTemplateMeta.name}</strong>) corresponde al
                ámbito de <strong>{activeTemplateMeta.scope}</strong>, mientras que el espacio activo está
                en modo <strong>{activeWorkspace.mode}</strong>. Para evitar rechazos en el servidor, cambie el
                espacio de trabajo.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleSwitchWorkspaceMode(activeTemplateMeta.requiredMode)}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shadow-sm shrink-0"
          >
            Cambiar a Modo {activeTemplateMeta.requiredMode}
          </button>
        </div>
      )}

      {/* 3. Notificación de estado / feedback */}
      {feedback && (
        <div
          role="status"
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-950'
              : feedback.type === 'warning'
              ? 'bg-amber-50 border border-amber-200 text-amber-950'
              : 'bg-rose-50 border border-rose-200 text-rose-950'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 p-1 text-sm font-bold"
            aria-label="Cerrar notificación"
          >
            ✕
          </button>
        </div>
      )}

      {/* 4. Disposición Principal: Catálogo lateral + Panel de preparación y Visor PDF */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda: Catálogo de las 21 plantillas oficiales (4 columnas lg) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">Catálogo de Formatos</h2>
                <span className="text-[11px] text-slate-500">21 plantillas oficiales del MINEDU</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                {filteredCatalog.length} / 21
              </span>
            </div>

            {/* Buscador de plantillas */}
            <div className="relative">
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Buscar por nombre o TMPL…"
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

            {/* Filtro por Categorías */}
            <div className="flex flex-wrap gap-1 text-[11px]">
              <button
                type="button"
                onClick={() => setSelectedCategory('TODOS')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  selectedCategory === 'TODOS'
                    ? 'bg-[#13594A] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos
              </button>
              {TEMPLATE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    selectedCategory === cat
                      ? 'bg-[#13594A] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.split(' ')[0]}
                </button>
              ))}
            </div>

            {/* Lista interactiva de plantillas */}
            <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-1">
              {filteredCatalog.map((tmpl) => {
                const isSelected = selectedTemplateId === tmpl.id;
                const isAllowed = allowedTemplateIds.has(tmpl.id);
                const isCompatible =
                  !activeWorkspace.mode || activeWorkspace.mode === tmpl.requiredMode;

                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tmpl)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all flex items-start gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13594A] ${
                      isSelected
                        ? 'bg-[#13594A]/5 border-[#13594A] shadow-xs ring-1 ring-[#13594A]'
                        : 'bg-white border-slate-200/80 hover:bg-slate-50/80 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-[10px] ${
                        isSelected
                          ? 'bg-[#13594A] text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {tmpl.number}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-slate-900 truncate block">
                          {tmpl.name}
                        </span>
                        <span className="font-mono text-[9px] text-slate-500 font-bold shrink-0">
                          {tmpl.id}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px]">
                        <span className="text-slate-500">{tmpl.category}</span>
                        <span>·</span>
                        <span
                          className={`font-semibold ${
                            isCompatible ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {tmpl.scope} ({tmpl.requiredMode})
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 line-clamp-1 mt-1">
                        {tmpl.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Columna Derecha: Parámetros del Documento, Checklist Preflight y Visor PDF (8 columnas lg) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Tarjeta de Configuración y Parámetros del Formato Seleccionado */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#13594A] text-white">
                    {activeTemplateMeta.id}
                  </span>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    {activeTemplateMeta.name}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeTemplateMeta.description} · {activeTemplateMeta.paperFormat} (
                  {activeTemplateMeta.pagesCount} pág.)
                </p>
              </div>

              {/* Botón de Generar PDF */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="document-generate"
                  onClick={handleGeneratePdf}
                  disabled={isGeneratingPdf || isPreflighting}
                  className="px-5 py-2.5 rounded-xl bg-[#13594A] hover:bg-[#0D382F] text-white text-xs font-bold transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13594A] disabled:opacity-50 flex items-center gap-2"
                >
                  {isGeneratingPdf ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Generando PDF…</span>
                    </>
                  ) : (
                    <>
                      <DocumentIcon className="w-4 h-4" />
                      <span>Ver formato rellenado</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Parámetros específicos según la plantilla */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-1 text-xs">
              {/* Selector de Aula / Grupo */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Grupo / Aula:</label>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-semibold truncate">
                  {currentGroup?.name || 'Aula no seleccionada'}
                </div>
              </div>

              {/* Selector de Unidad Didáctica (si aplica para asistencia o evaluación) */}
              {activeTemplateMeta.scope === 'Unidad' && (
                <div>
                  <label htmlFor="select-unit" className="font-bold text-slate-700 block mb-1">
                    Unidad Didáctica:
                  </label>
                  <select
                    id="select-unit"
                    value={selectedUnit}
                    onChange={(e) => setSelectedUnit(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#13594A]"
                  >
                    {availableUnits.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Selector de Estudiante (para formatos individuales TMPL-02, TMPL-20, TMPL-21) */}
              {activeTemplateMeta.isIndividual && (
                <div>
                  <label htmlFor="select-enrollment" className="font-bold text-slate-700 block mb-1">
                    Estudiante / Matrícula:
                  </label>
                  <select
                    id="select-enrollment"
                    value={selectedEnrollmentId}
                    onChange={(e) => setSelectedEnrollmentId(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#13594A]"
                  >
                    {rosterEnrollments.length === 0 ? (
                      <option value="">Sin estudiantes activos</option>
                    ) : (
                      rosterEnrollments.map((en) => (
                        <option key={en.id} value={en.id}>
                          {en.name} (DNI: {en.document})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {/* Checkbox: Incluir historial de retirados */}
              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="include-retired"
                  checked={includeRetired}
                  onChange={(e) => setIncludeRetired(e.target.checked)}
                  className="w-4 h-4 rounded text-[#13594A] focus:ring-[#13594A] border-slate-300"
                />
                <label htmlFor="include-retired" className="text-slate-700 font-semibold cursor-pointer">
                  Incluir historial (retirados)
                </label>
              </div>

              {/* Checkbox: Modo Demostración */}
              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="demo-fill"
                  checked={demoFill}
                  onChange={(e) => setDemoFill(e.target.checked)}
                  className="w-4 h-4 rounded text-[#13594A] focus:ring-[#13594A] border-slate-300"
                />
                <label htmlFor="demo-fill" className="text-amber-900 font-bold cursor-pointer">
                  Modo Demostración (simular datos)
                </label>
              </div>
            </div>
          </div>

          {/* Checklist Preflight Oficial */}
          {preflightDoc && (
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                      preflightDoc.preflight.complete
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {preflightDoc.preflight.complete ? '✓' : '⚠'}
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                      Checklist Preflight del Documento
                    </h3>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Huella digital: {preflightDoc.fingerprint.slice(0, 16)}…
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-xl text-xs font-bold ${
                      preflightDoc.preflight.complete
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                        : 'bg-amber-50 text-amber-900 border border-amber-300'
                    }`}
                  >
                    {preflightDoc.preflight.filled} / {preflightDoc.preflight.total} parámetros completos
                  </span>
                </div>
              </div>

              {/* Lista de campos preflight */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs max-h-[220px] overflow-y-auto pr-1">
                {preflightDoc.preflight.fields.map((f) => {
                  const isReady = f.status === 'READY';
                  return (
                    <div
                      key={f.key}
                      className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                        isReady
                          ? 'bg-emerald-50/30 border-emerald-200/70 text-slate-800'
                          : 'bg-amber-50/50 border-amber-200 text-amber-950'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                          isReady ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                        }`}
                      >
                        {isReady ? '✓' : '○'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <strong className="block text-[11px] truncate">{f.label || f.key}</strong>
                        <span className="text-[10px] text-slate-500 block truncate">
                          Origen: {f.source}
                        </span>
                        <span className="text-[11px] font-mono block mt-0.5 text-slate-700 truncate">
                          {isReady ? f.value : 'Pendiente de registrar'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Advertencias emitidas por el backend */}
              {preflightDoc.warnings && preflightDoc.warnings.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-1">
                  <strong className="block font-bold">Observaciones del motor documental:</strong>
                  {preflightDoc.warnings.map((w, idx) => (
                    <p key={idx}>• {w}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Visualizador PDF Integrado */}
          {pdfBlob ? (
            <PdfViewer
              blob={pdfBlob}
              filename={suggestedFilename}
              title={`${activeTemplateMeta.name} — ${currentGroup?.name || ''}`}
              isDemo={isDemoActive}
              isDraft={!isDemoActive && !preflightDoc?.preflight?.complete}
              isComplete={!isDemoActive && Boolean(preflightDoc?.preflight?.complete)}
              onClose={() => setPdfBlob(null)}
              extraControls={
                isAttendanceTemplate &&
                isDemoActive && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleSimulateAttendance}
                      disabled={isSimulatingAttendance}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 text-xs font-bold transition-all disabled:opacity-50"
                      title="Llenar toda la asistencia de la unidad con marcas sintéticas reales"
                    >
                      {isSimulatingAttendance ? 'Llenando…' : 'Llenar Asistencia (Demo)'}
                    </button>

                    <button
                      type="button"
                      onClick={handleClearSimulatedAttendance}
                      disabled={isSimulatingAttendance}
                      className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all disabled:opacity-50"
                      title="Limpiar marcas de asistencia registradas en esta unidad"
                    >
                      Limpiar
                    </button>
                  </div>
                )
              }
            />
          ) : (
            <div className="bg-white rounded-3xl p-12 border border-slate-200/80 shadow-sm text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <DocumentIcon className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Vista Previa del Documento</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                Haga clic en <strong>"Ver formato rellenado"</strong> para generar el archivo PDF oficial
                y visualizarlo en el visor interactivo de alta resolución.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Selección de Aula y Unidad */}
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
};

export default CentroDocumental;
