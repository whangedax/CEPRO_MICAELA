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

import { DashboardPhotoBand } from '../components/ui/DashboardPhotoBand';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import apiClient from '../api/client';
import {
  DocumentConfigurationResponse,
  DocumentCatalogItem,
  DocumentEmissionRecord,
  DocumentFieldSchema,
  DocumentPreflightResponse,
  DocumentSettingRecord,
  WorkspaceGroupOption,
  StudentEnrollmentItem,
  StudentItem,
  ApiError,
} from '../api/types';
import {
  OFFICIAL_TEMPLATES,
  TemplateMetadata,
  getTemplateById,
  getVisibleTemplates,
  getAvailableCategories,
  applyRegistryFieldChange,
  assembleInstitutionalRegisterCode,
  inferProgramAcronym,
  formatStudentNameForTitle,
  formatStudentNameForCertificate,
  formatTitleExpeditionSentence,
  TITLE_SPANISH_MONTHS,
} from '../utils/documentTemplates';
import { resolveUnitDates } from '../utils/calendar';
import { SelectUnitModal } from '../components/academic/SelectUnitModal';
import { ActiveUnitContextBanner } from '../components/academic/ActiveUnitContextBanner';
import { PdfViewer } from '../components/ui/PdfViewer';
import {
  DocumentIcon,
  FolderOpenIcon,
  DocConfigIcon,
  RefreshIcon,
  SaveIcon,
  SearchIcon,
  ClockIcon,
  KeyIcon,
} from '../components/ui/Icons';

const TITLE_CODE_PARTS = new Set(['registryCorrelative', 'registryLevelCode', 'programAcronym', 'registryShortRef', 'registryCodeYear']);
const TITLE_MAIN_FIELDS = new Set(['registerCode', 'ugelCode', 'referenceResolution', 'titleEmissionDate']);
const CERT_ONLY_FIELDS = new Set([
  'certRegisterCode',
  'certCorrelative',
  'certLevelCode',
  'certProgramAcronym',
  'certShortRef',
  'certCodeYear',
  'certEmissionDate',
  'certReferenceResolution',
  'certInstitutionName',
  'certDirectorName',
  'certSemesterLabel',
  'certStudentName',
]);
const CERTIFICATION_TEMPLATE_IDS = new Set(['TMPL-20', 'TMPL-21', 'TMPL-22', 'TMPL-23']);
const OFFICIAL_2026_MANDATORY_IDS = new Set(['TMPL-20', 'TMPL-21', 'TMPL-22', 'TMPL-23']);

const REGISTRY_PANEL_FIELDS: Array<{
  key: string;
  label: string;
  type: 'text' | 'date';
  placeholder: string;
}> = [
  {
    key: 'registryCorrelative',
    label: 'Correlativo (6 dígitos)',
    type: 'text',
    placeholder: 'Ej.: 000333',
  },
  {
    key: 'programAcronym',
    label: 'Sigla del programa',
    type: 'text',
    placeholder: 'Ej.: CE, CI, MA',
  },
  {
    key: 'registryShortRef',
    label: 'Referencia corta (2 dígitos)',
    type: 'text',
    placeholder: 'Ej.: 25',
  },
  {
    key: 'registryCodeYear',
    label: 'Año del código (4 dígitos)',
    type: 'text',
    placeholder: 'Ej.: 2026',
  },
  {
    key: 'registerCode',
    label: 'Código de registro institucional (A)',
    type: 'text',
    placeholder: 'Ej.: 000333-AT-30425346-CE25-2026',
  },
  {
    key: 'ugelCode',
    label: 'Código de registro UGEL (B)',
    type: 'text',
    placeholder: 'Ej.: 000333-AT-00333-CE25-2026',
  },
  {
    key: 'referenceResolution',
    label: 'Resolución de referencia en portada (C)',
    type: 'text',
    placeholder: 'Ej.: R.D. Nº 2053-2025-DUGEL-SR',
  },
  {
    key: 'titleEmissionDate',
    label: 'Fecha de expedición del título',
    type: 'date',
    placeholder: '',
  },
  {
    key: 'tituladoName',
    label: 'Nombre del titulado en diploma (D, opcional)',
    type: 'text',
    placeholder: 'Opcional si difiere de la ficha del estudiante',
  },
  {
    key: 'officialTitleText',
    label: 'Denominación del título en diploma (E, opcional)',
    type: 'text',
    placeholder: 'Ej.: AUXILIAR TÉCNICO EN COMPUTACIÓN',
  },
  {
    key: 'directorName',
    label: 'Director firmante',
    type: 'text',
    placeholder: 'Ej.: Prof. Eloy Valerio Paredes Feliciano',
  },
  {
    key: 'resolutionNumber',
    label: 'N° de Resolución Directoral',
    type: 'text',
    placeholder: 'Ej.: 000333-2026-DCETPROMB-SM',
  },
  {
    key: 'resolutionDate',
    label: 'Fecha de Resolución Directoral',
    type: 'date',
    placeholder: 'AAAA-MM-DD',
  },
  {
    key: 'expedienteNumber',
    label: 'N° de Expediente',
    type: 'text',
    placeholder: 'Ej.: EXP-2026-0045',
  },
  {
    key: 'expedienteDate',
    label: 'Fecha de Expediente',
    type: 'date',
    placeholder: 'AAAA-MM-DD',
  },
  {
    key: 'graduationDate',
    label: 'Fecha de egreso',
    type: 'date',
    placeholder: 'AAAA-MM-DD',
  },
  {
    key: 'specialtyTeacher',
    label: 'Docente / Especialidad de certificado',
    type: 'text',
    placeholder: 'Ej.: Lic. María Elena Quispe Flores',
  },
  {
    key: 'certCorrelative',
    label: 'Correlativo de certificado (6 dígitos)',
    type: 'text',
    placeholder: 'Ej.: 000207',
  },
  {
    key: 'certLevelCode',
    label: 'Nivel formativo de certificado',
    type: 'text',
    placeholder: 'AT',
  },
  {
    key: 'certProgramAcronym',
    label: 'Sigla de carrera en certificado',
    type: 'text',
    placeholder: 'Ej.: CE, CI, MA',
  },
  {
    key: 'certShortRef',
    label: 'Año de término en certificado (2 dígitos)',
    type: 'text',
    placeholder: 'Ej.: 24',
  },
  {
    key: 'certCodeYear',
    label: 'Año de trámite en certificado (4 dígitos)',
    type: 'text',
    placeholder: 'Ej.: 2026',
  },
  {
    key: 'certRegisterCode',
    label: 'Código de registro del certificado modular',
    type: 'text',
    placeholder: 'Ej.: 000207-AT-76697820-CE24-2026',
  },
  {
    key: 'certEmissionDate',
    label: 'Fecha de emisión del certificado',
    type: 'date',
    placeholder: 'AAAA-MM-DD',
  },
  {
    key: 'certReferenceResolution',
    label: 'Resolución de autorización en certificado (R.D.)',
    type: 'text',
    placeholder: 'Ej.: R.D. Nº 3107-2023-DUGEL-SR',
  },
  {
    key: 'certInstitutionName',
    label: 'Institución donde realizó EFSRT',
    type: 'text',
    placeholder: 'CETPRO Micaela Bastidas',
  },
  {
    key: 'certDirectorName',
    label: 'Director firmante en certificado',
    type: 'text',
    placeholder: 'Prof. Eloy Valerio Paredes Feliciano',
  },
  {
    key: 'certSemesterLabel',
    label: 'Semestre mostrado en certificado',
    type: 'text',
    placeholder: 'I Semestre o II Semestre',
  },
  {
    key: 'certStudentName',
    label: 'Nombre en el certificado modular',
    type: 'text',
    placeholder: 'Apellidos y Nombres',
  },
];

function formatCategoryBadge(category: string): string {
  return category === 'CERTIFICACION' ? 'Certificación 2026' : category;
}

function formatCategoryFilterLabel(category: string): string {
  return category === 'CERTIFICACION' ? 'Certificación' : category.split(' ')[0];
}

function formatEmissionTimestamp(iso?: string): string {
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

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
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [registryDirty, setRegistryDirty] = useState(false);
  const [includeRetired, setIncludeRetired] = useState<boolean>(false);
  const [demoFill, setDemoFill] = useState<boolean>(false);
  const [official2026, setOfficial2026] = useState<boolean>(true);

  // Estados de preflight y generación de PDF
  const [isPreflighting, setIsPreflighting] = useState<boolean>(false);
  const [preflightDoc, setPreflightDoc] = useState<DocumentPreflightResponse | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  // Panel compacto de datos registrales 2026 (TMPL-20, 21, 22, 23)
  const [registryForm, setRegistryForm] = useState<Record<string, string>>({});
  const [isSuggestingRegistry, setIsSuggestingRegistry] = useState<boolean>(false);
  const [isSavingRegistry, setIsSavingRegistry] = useState<boolean>(false);
  const [registryNotice, setRegistryNotice] = useState<{
    type: 'success' | 'info' | 'error';
    message: string;
  } | null>(null);

  // Historial de emisiones oficiales y buscador de duplicados exactos
  const [emissions, setEmissions] = useState<DocumentEmissionRecord[]>([]);
  const [isLoadingEmissions, setIsLoadingEmissions] = useState<boolean>(false);
  const [emissionsError, setEmissionsError] = useState<string | null>(null);
  const [isEmissionsExpanded, setIsEmissionsExpanded] = useState<boolean>(false);
  const [emissionsTemplateFilter, setEmissionsTemplateFilter] = useState<'ALL' | 'SELECTED'>('ALL');
  const [emissionsSearchQuery, setEmissionsSearchQuery] = useState<string>('');
  const [emissionsGlobalScope, setEmissionsGlobalScope] = useState<boolean>(false);
  const [reprintingEmissionId, setReprintingEmissionId] = useState<string | null>(null);
  const [deletingEmissionId, setDeletingEmissionId] = useState<string | null>(null);
  const [confirmDeleteEmission, setConfirmDeleteEmission] = useState<DocumentEmissionRecord | null>(null);

  const formatScopeHumanLabel = (scopeOrMode?: string): string => {
    const val = (scopeOrMode || '').toUpperCase().trim();
    if (val === 'UNIT' || val === 'UNIDAD') return 'Alcance: Por Unidad Didáctica';
    if (val === 'GROUP' || val === 'GRUPO' || val === 'AULA') return 'Alcance: Por Aula / Sección Completa';
    if (val === 'MODULE' || val === 'MÓDULO' || val === 'MODULO') return 'Alcance: Por Módulo Formativo';
    if (val === 'PRACTICE' || val === 'PRÁCTICA' || val === 'PRACTICA' || val === 'EFSRT') return 'Alcance: Prácticas EFSRT';
    if (val === 'INSTITUTION' || val === 'INSTITUCIÓN' || val === 'INSTITUCION') return 'Alcance: Institucional General (CETPRO)';
    return `Alcance: ${scopeOrMode || 'General'}`;
  };

  const formatModeShortLabel = (mode?: string): string => {
    const val = (mode || '').toUpperCase().trim();
    if (val === 'UNIT') return 'Unidad Didáctica';
    if (val === 'MODULE') return 'Módulo / Aula Completa';
    if (val === 'PRACTICE') return 'Prácticas EFSRT';
    return mode || 'General';
  };

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

  // Secuencias independientes para descarte de respuestas obsoletas
  const preflightSeqRef = useRef<number>(0);
  const pdfSeqRef = useRef<number>(0);
  const shouldRegeneratePreviewRef = useRef<boolean>(false);

  // 1. Cargar configuración documental oficial desde el backend
  const loadConfiguration = useCallback(async (): Promise<DocumentConfigurationResponse | null> => {
    setIsConfigLoading(true);
    try {
      const cfg = await apiClient.getDocumentConfiguration();
      setDocConfig(cfg);
      return cfg;
    } catch (err: unknown) {
      console.warn('No se pudo cargar la configuración documental:', err);
      return null;
    } finally {
      setIsConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfiguration();
  }, [loadConfiguration, activeWorkspace]);

  // Cargar historial de emisiones oficiales y títulos emitidos
  const loadEmissions = useCallback(async () => {
    const useGlobal = emissionsGlobalScope || selectedTemplateId === 'TMPL-21';
    if (!useGlobal && !activeWorkspace?.groupId) {
      setEmissions([]);
      return;
    }
    setIsLoadingEmissions(true);
    setEmissionsError(null);
    try {
      const list = await apiClient.getDocumentEmissions({
        ...(!useGlobal && activeWorkspace?.groupId ? { groupId: activeWorkspace.groupId } : {}),
        ...(!useGlobal && activeWorkspace?.year ? { year: activeWorkspace.year } : {}),
        ...(emissionsSearchQuery.trim() ? { query: emissionsSearchQuery.trim() } : {}),
      });
      setEmissions(Array.isArray(list) ? list : []);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setEmissionsError(
        apiErr?.status === 404
          ? 'El historial de emisiones oficiales (/api/document/emissions) no está habilitado aún en el servidor local.'
          : apiErr?.error || 'No se pudo consultar el historial de emisiones oficiales.'
      );
    } finally {
      setIsLoadingEmissions(false);
    }
  }, [activeWorkspace?.groupId, activeWorkspace?.year, emissionsGlobalScope, selectedTemplateId, emissionsSearchQuery]);

  useEffect(() => {
    if (!isEmissionsExpanded) return;
    loadEmissions();
  }, [isEmissionsExpanded, loadEmissions]);

  const handleReprintDuplicate = async (em: DocumentEmissionRecord) => {
    setReprintingEmissionId(em.id);
    setFeedback(null);
    try {
      const blob = await apiClient.reprintDocumentEmission(em.id);
      setPdfBlob(blob);
      setFeedback({
        type: 'success',
        message: `Duplicado exacto de ${em.registerCode || em.studentName || em.templateId} cargado para impresión o descarga.`,
      });
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setFeedback({
        type: 'error',
        message: apiErr?.error || 'No se pudo reimprimir el duplicado exacto desde la base de datos.',
      });
    } finally {
      setReprintingEmissionId(null);
    }
  };

  const handleConfirmDeleteEmission = async () => {
    if (!confirmDeleteEmission) return;
    const target = confirmDeleteEmission;
    setDeletingEmissionId(target.id);
    setFeedback(null);
    try {
      const res = await apiClient.deleteDocumentEmission(target.id);
      setConfirmDeleteEmission(null);
      setEmissions((prev) => prev.filter((item) => item.id !== target.id));
      await Promise.all([loadEmissions(), loadConfiguration()]);
      if (target.enrollmentId && target.enrollmentId === selectedEnrollmentId) {
        setPdfBlob(null);
        setPreflightDoc(null);
      }
      setFeedback({
        type: 'success',
        message: `Título o emisión eliminada (${target.registerCode || target.templateId}).${
          res.freedCorrelative ? ` El correlativo ${res.freedCorrelative} quedó libre nuevamente.` : ''
        }`,
      });
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setFeedback({
        type: 'error',
        message: apiErr?.error || 'No se pudo eliminar el registro emitido.',
      });
    } finally {
      setDeletingEmissionId(null);
    }
  };

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

  // Lista de matrículas del grupo activo para formatos individuales (TMPL-02, 20, 21, 22, 23)
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
        code: en.code || '',
        name: s?.name || en.code || en.id,
        document: s?.document || 'S/D',
        active: en.active,
      };
    });

    list.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    return list;
  }, [dashboardData, activeWorkspace, includeRetired]);

  // Filtrado rápido por DNI o apellidos manteniendo la selección válida cuando corresponda
  const filteredRosterEnrollments = useMemo(() => {
    const normalize = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    const query = normalize(studentSearch.trim());
    if (!query) return rosterEnrollments;
    return rosterEnrollments.filter(
      (en) =>
        normalize(en.name).includes(query) ||
        en.document.toLowerCase().includes(query) ||
        en.code.toLowerCase().includes(query)
    );
  }, [rosterEnrollments, studentSearch]);

  const selectedEnrollmentItem = useMemo(() => {
    return rosterEnrollments.find((en) => en.id === selectedEnrollmentId) || null;
  }, [rosterEnrollments, selectedEnrollmentId, selectedTemplateId]);

  // Sincronizar unidad y estudiante por defecto al cambiar de grupo o unidad
  useEffect(() => {
    if (activeWorkspace?.unit && availableUnits.includes(activeWorkspace.unit)) {
      setSelectedUnit(activeWorkspace.unit);
    } else if (availableUnits.length > 0) {
      setSelectedUnit(availableUnits[0]);
    }
  }, [activeWorkspace, availableUnits]);

  // Calendario y vigencia de la unidad seleccionada
  const selectedUnitOption = useMemo(() => {
    if (!options?.groups || !currentGroup?.id || !selectedUnit) return null;
    const grp = options.groups.find((g) => g.id === currentGroup.id);
    return grp?.units?.find((u) => u.code === selectedUnit) || null;
  }, [options, currentGroup, selectedUnit]);

  const legacyCalendar = (activeWorkspace?.periodId || currentGroup?.periodId) === '2026-I';
  const selectedUnitStartDate: string =
    selectedUnitOption?.fechaInicio || currentGroup?.fechaInicio || (legacyCalendar ? '2026-03-16' : '');
  const selectedUnitEndDate: string =
    selectedUnitOption?.fechaFin || currentGroup?.fechaFin || (legacyCalendar ? '2026-07-24' : '');

  const selectedUnitCalendar = useMemo(() => {
    return resolveUnitDates(selectedUnitStartDate, selectedUnitEndDate);
  }, [selectedUnitStartDate, selectedUnitEndDate]);

  useEffect(() => {
    if (rosterEnrollments.length === 0) {
      if (selectedEnrollmentId) setSelectedEnrollmentId('');
      return;
    }
    if (!rosterEnrollments.some((en) => en.id === selectedEnrollmentId)) {
      setSelectedEnrollmentId(selectedTemplateId === 'TMPL-21' ? '' : rosterEnrollments[0].id);
    }
  }, [rosterEnrollments, selectedEnrollmentId]);

  // Catálogo activo enviado por backend (prioriza extendedCatalog 23 ítems y respeta RBAC)
  const activeBackendCatalog = useMemo<DocumentCatalogItem[]>(() => {
    if (docConfig?.extendedCatalog?.length) return docConfig.extendedCatalog;
    if (docConfig?.catalog?.length) return docConfig.catalog;
    return [];
  }, [docConfig]);

  const hasExtendedCatalog = Boolean(docConfig?.extendedCatalog?.length);

  // Plantillas pertinentes según el rol, aula, unidad didáctica activa y catálogo autorizado
  const contextTemplates = useMemo(() => {
    const visible = getVisibleTemplates({
      role: user?.role,
      groupId: activeWorkspace?.groupId,
      unitCode: activeWorkspace?.unit || selectedUnit,
      availableUnits,
      mode: activeWorkspace?.mode,
      onlyCurrentUnit: Boolean(activeWorkspace?.unit || selectedUnit),
      includeExtensions: hasExtendedCatalog,
    });
    if (activeBackendCatalog.length > 0) {
      const backendSet = new Set(activeBackendCatalog.map((t: DocumentCatalogItem) => t.id));
      return visible.filter((t) => backendSet.has(t.id));
    }
    return visible;
  }, [
    user?.role,
    activeWorkspace?.groupId,
    activeWorkspace?.unit,
    selectedUnit,
    availableUnits,
    activeWorkspace?.mode,
    hasExtendedCatalog,
    activeBackendCatalog,
  ]);

  // Metadatos de la plantilla actualmente seleccionada
  const activeTemplateMeta = useMemo(() => {
    return getTemplateById(selectedTemplateId) || contextTemplates[0] || OFFICIAL_TEMPLATES[0];
  }, [selectedTemplateId, contextTemplates]);

  const supportsOfficial2026 = Boolean(activeTemplateMeta.official2026Support);
  const isOfficial2026Mandatory = OFFICIAL_2026_MANDATORY_IDS.has(activeTemplateMeta.id);
  const effectiveOfficial2026 = supportsOfficial2026
    ? isOfficial2026Mandatory
      ? true
      : official2026
    : false;

  // Categorías con al menos una plantilla visible para el usuario y contexto actual
  const availableCategories = useMemo(() => {
    return getAvailableCategories(contextTemplates);
  }, [contextTemplates]);

  // Reajustar categoría seleccionada si ya no existe en las pertinentes
  useEffect(() => {
    if (selectedCategory !== 'TODOS' && !availableCategories.includes(selectedCategory as any)) {
      setSelectedCategory('TODOS');
    }
  }, [availableCategories, selectedCategory]);

  // Reajustar plantilla seleccionada si queda fuera del alcance de la UD o rol
  useEffect(() => {
    if (contextTemplates.length > 0) {
      const exists = contextTemplates.some((t) => t.id === selectedTemplateId);
      if (!exists) {
        setSelectedTemplateId(contextTemplates[0].id);
      }
    }
  }, [contextTemplates, selectedTemplateId]);

  // Plantillas permitidas según el backend (extendedCatalog / catalog) y el rol del usuario
  const allowedTemplateIds = useMemo(() => {
    if (activeBackendCatalog.length > 0) {
      const backendSet = new Set(activeBackendCatalog.map((t: DocumentCatalogItem) => t.id));
      return new Set(contextTemplates.filter((t) => backendSet.has(t.id)).map((t) => t.id));
    }
    return new Set(contextTemplates.map((t) => t.id));
  }, [activeBackendCatalog, contextTemplates]);

  // Filtrado final de las plantillas del catálogo interactivo
  const filteredCatalog = useMemo(() => {
    return contextTemplates.filter((tmpl) => {
      if (!allowedTemplateIds.has(tmpl.id)) {
        return false;
      }
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
  }, [contextTemplates, allowedTemplateIds, selectedCategory, searchFilter]);

  // Esquema y permisos del panel compacto de Datos Registrales 2026
  const isCertificationTemplate = CERTIFICATION_TEMPLATE_IDS.has(activeTemplateMeta.id);
  const isTitle = activeTemplateMeta.id === 'TMPL-21';
  const isCertificate = activeTemplateMeta.id === 'TMPL-20';
  const registrySchemaFields = useMemo<DocumentFieldSchema[]>(() => {
    return docConfig?.schema?.registry || [];
  }, [docConfig]);

  const editableRegistryPanelFields = useMemo(() => {
    if (!user?.role || !registrySchemaFields.length) return [];
    const schemaMap = new Map(registrySchemaFields.map((f) => [f.key, f]));
    return REGISTRY_PANEL_FIELDS.filter((meta) => {
      const schemaField = schemaMap.get(meta.key);
      if (!schemaField || !schemaField.roles.includes(user.role)) return false;
      if (!isTitle && meta.key === 'titleEmissionDate') return false;
      if (!isCertificate && CERT_ONLY_FIELDS.has(meta.key)) return false;
      return true;
    }).map((meta) => {
      const schemaField = schemaMap.get(meta.key)!;
      return {
        ...meta,
        label: meta.label,
        type: schemaField.type === 'date' ? ('date' as const) : ('text' as const),
      };
    });
  }, [user?.role, registrySchemaFields, isTitle, isCertificate]);

  const canAutoSuggestRegistry = useMemo(() => {
    const hasAdminSuggestRole =
      user?.role === 'DIRECTOR' || (isCertificate && user?.role === 'SECRETARIA');
    return (
      hasAdminSuggestRole &&
      editableRegistryPanelFields.some(
        (f) =>
          f.key === 'registerCode' ||
          f.key === 'certRegisterCode' ||
          f.key === 'resolutionNumber'
      )
    );
  }, [user?.role, isCertificate, editableRegistryPanelFields]);

  const currentRegistryScopeId = selectedEnrollmentId ? `registry:${selectedEnrollmentId}` : '';

  const currentRegistryRecord = useMemo<DocumentSettingRecord | null>(() => {
    if (!currentRegistryScopeId || !docConfig?.settings) return null;
    return docConfig.settings.find((s) => s.id === currentRegistryScopeId) || null;
  }, [docConfig, currentRegistryScopeId]);

  const currentProgramObj = useMemo(() => {
    if (!currentGroup?.programId || !dashboardData?.programs) return null;
    return dashboardData.programs.find((p) => p.id === currentGroup.programId) || null;
  }, [dashboardData?.programs, currentGroup?.programId]);

  const currentProgramSettings = useMemo<Record<string, string>>(() => {
    if (!currentGroup?.programId) return {};
    const scopeKey = `program:${currentGroup.programId}`;
    const def = docConfig?.defaults?.[scopeKey] || {};
    const saved = docConfig?.settings?.find((s) => s.id === scopeKey)?.fields || {};
    return { ...def, ...saved } as Record<string, string>;
  }, [docConfig, currentGroup?.programId]);

  const currentInstitutionSettings = useMemo<Record<string, string>>(() => {
    const def = docConfig?.defaults?.['institution:institution'] || {};
    const saved = docConfig?.settings?.find((s) => s.id === 'institution:institution')?.fields || {};
    return { ...def, ...saved } as Record<string, string>;
  }, [docConfig]);

  useEffect(() => {
    setRegistryDirty(false);
    if (!currentRegistryScopeId) {
      setRegistryForm({});
      setRegistryNotice(null);
      return;
    }
    const defaultsForScope = docConfig?.defaults?.[currentRegistryScopeId] || {};
    const savedFields = currentRegistryRecord?.fields || {};
    let nextForm: Record<string, string> = {};
    for (const meta of REGISTRY_PANEL_FIELDS) {
      const val = savedFields[meta.key] ?? defaultsForScope[meta.key] ?? '';
      nextForm[meta.key] = val !== null && val !== undefined ? String(val) : '';
    }
    if (nextForm.registerCode && !nextForm.registryCorrelative) {
      nextForm = applyRegistryFieldChange(
        nextForm,
        'registerCode',
        nextForm.registerCode,
        selectedEnrollmentItem?.document
      );
    }
    if (isTitle && selectedEnrollmentItem) {
      const progName = String(
        currentProgramObj?.nombre || currentProgramObj?.name || ''
      ).trim();
      const defaultSigla =
        String(currentProgramSettings.sigla || '').trim().toUpperCase() ||
        inferProgramAcronym(currentGroup?.programId, progName) ||
        'CO';
      const defaultYear4 = String(new Date().getFullYear());
      const defaultShortRef = String(currentGroup?.periodId || defaultYear4)
        .replace(/\D/g, '')
        .slice(0, 4)
        .slice(-2) || defaultYear4.slice(-2);

      if (!nextForm.registryLevelCode) nextForm.registryLevelCode = 'AT';
      if (!nextForm.tituladoName) {
        nextForm.tituladoName = formatStudentNameForTitle(selectedEnrollmentItem.name);
      }
      if (!nextForm.officialTitleText) {
        nextForm.officialTitleText =
          String(currentProgramSettings.officialTitleText || '').trim() ||
          (progName ? `AUXILIAR TÉCNICO EN ${progName.toUpperCase()}` : '');
      }
      if (!nextForm.programAcronym) nextForm.programAcronym = defaultSigla;
      if (!nextForm.registryShortRef) nextForm.registryShortRef = defaultShortRef;
      if (!nextForm.registryCodeYear) nextForm.registryCodeYear = defaultYear4;
      if (!nextForm.titleEmissionDate) {
        nextForm.titleEmissionDate = new Date().toISOString().slice(0, 10);
      }
      if (!nextForm.referenceResolution) {
        nextForm.referenceResolution =
          String(currentProgramSettings.resolucionPrograma || '').trim() ||
          String(currentInstitutionSettings.resolucionAutorizacion || '').trim() ||
          'R.D. Nº 3107-2023-DUGEL-SR';
      }
      if (!nextForm.directorName) {
        nextForm.directorName =
          String(currentInstitutionSettings.directorNombre || '').trim() ||
          'Prof. Eloy Valerio Paredes Feliciano';
      }
      if (nextForm.registryCorrelative && !nextForm.registerCode) {
        nextForm.registerCode = assembleInstitutionalRegisterCode(
          nextForm,
          selectedEnrollmentItem.document
        );
      }
    }
    if (isCertificate && selectedEnrollmentItem) {
      const progName = String(
        currentProgramObj?.nombre || currentProgramObj?.name || ''
      ).trim();
      const defaultSigla =
        String(currentProgramSettings.sigla || '').trim().toUpperCase() ||
        inferProgramAcronym(currentGroup?.programId, progName) ||
        'CO';
      const defaultYear4 = String(new Date().getFullYear());
      const defaultShortRef = String(currentGroup?.periodId || defaultYear4)
        .replace(/\D/g, '')
        .slice(0, 4)
        .slice(-2) || defaultYear4.slice(-2);
      const programModules = (dashboardData?.modules || [])
        .filter((m) => {
          const modAny = m as { programId?: string; programaId?: string };
          return (modAny.programId || modAny.programaId) === currentGroup?.programId;
        })
        .sort((a, b) => {
          const numA = Number((a as { numeroModulo?: number }).numeroModulo ?? 0);
          const numB = Number((b as { numeroModulo?: number }).numeroModulo ?? 0);
          return numA - numB;
        });
      const modIdx = programModules.findIndex((m) => m.id === currentGroup?.moduleId);
      const currentMod =
        modIdx >= 0
          ? programModules[modIdx]
          : dashboardData?.modules?.find((m) => m.id === currentGroup?.moduleId);
      const currentModAny = currentMod as { numeroModulo?: number; id?: string } | undefined;
      const isModule2 =
        Number(currentModAny?.numeroModulo) === 2 ||
        modIdx === 1 ||
        /\b(II|M2)\b/i.test(String(currentModAny?.id || ''));

      if (!nextForm.certLevelCode) nextForm.certLevelCode = 'AT';
      if (!nextForm.certStudentName) {
        nextForm.certStudentName = formatStudentNameForCertificate(selectedEnrollmentItem.name);
      }
      if (!nextForm.certProgramAcronym) nextForm.certProgramAcronym = defaultSigla;
      if (!nextForm.certShortRef) nextForm.certShortRef = defaultShortRef;
      if (!nextForm.certCodeYear) nextForm.certCodeYear = defaultYear4;
      if (!nextForm.certEmissionDate) {
        nextForm.certEmissionDate = new Date().toISOString().slice(0, 10);
      }
      if (!nextForm.certReferenceResolution) {
        nextForm.certReferenceResolution =
          String(currentProgramSettings.resolucionPrograma || '').trim() ||
          String(currentInstitutionSettings.resolucionAutorizacion || '').trim() ||
          'RESOLUCIÓN DIRECTORAL N° 3107-2023-DUGEL-SR';
      }
      if (!nextForm.certInstitutionName) {
        nextForm.certInstitutionName = 'CETPRO Micaela Bastidas';
      }
      if (!nextForm.certDirectorName) {
        nextForm.certDirectorName =
          String(currentInstitutionSettings.directorNombre || '').trim() ||
          'Prof. Eloy Valerio, PAREDES FELICIANO';
      }
      if (!nextForm.certSemesterLabel) {
        nextForm.certSemesterLabel = isModule2 ? 'II Semestre' : 'I Semestre';
      }
      if (nextForm.certRegisterCode && !nextForm.certCorrelative) {
        const parsedCert = /^(\d{6})-([A-Z0-9]{2,4})-(\d{8})-([A-Z]{2,6})(\d{2})-(\d{4})$/i.exec(
          nextForm.certRegisterCode.trim()
        );
        if (parsedCert) {
          nextForm.certCorrelative = parsedCert[1];
          nextForm.certLevelCode = parsedCert[2].toUpperCase();
          nextForm.certProgramAcronym = parsedCert[4].toUpperCase();
          nextForm.certShortRef = parsedCert[5];
          nextForm.certCodeYear = parsedCert[6];
        }
      }
      if (nextForm.certCorrelative && !nextForm.certRegisterCode) {
        nextForm.certRegisterCode = assembleInstitutionalRegisterCode(
          {
            registryCorrelative: nextForm.certCorrelative,
            registryLevelCode: nextForm.certLevelCode,
            programAcronym: nextForm.certProgramAcronym,
            registryShortRef: nextForm.certShortRef,
            registryCodeYear: nextForm.certCodeYear,
          },
          selectedEnrollmentItem.document
        );
      }
    }
    setRegistryForm(nextForm);
    setRegistryNotice(null);
  }, [
    currentRegistryScopeId,
    docConfig,
    currentRegistryRecord,
    selectedEnrollmentItem,
    isTitle,
    isCertificate,
    dashboardData?.modules,
    currentGroup?.programId,
    currentGroup?.moduleId,
    currentGroup?.periodId,
    currentProgramObj,
    currentProgramSettings,
    currentInstitutionSettings,
  ]);

  const renderRegistryFields = (fields: typeof editableRegistryPanelFields) => (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field.key} className="min-w-0 space-y-1.5">
          <label htmlFor={'registry-inline-' + field.key} className="block text-sm font-semibold text-ink">{field.label}</label>
          <input
            id={'registry-inline-' + field.key}
            type={field.type}
            value={registryForm[field.key] ?? ''}
            disabled={isSavingRegistry || isSuggestingRegistry}
            onChange={(event) => {
              const value = event.target.value;
              setRegistryForm((previous) => !isTitle
                ? applyRegistryFieldChange(previous, field.key, value, selectedEnrollmentItem?.document)
                : { ...previous, [field.key]: field.key === 'registerCode' ? value.toUpperCase() : value });
              setRegistryDirty(true);
              setRegistryNotice(null);
            }}
            placeholder={field.placeholder}
            className="min-h-11 w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
          {isTitle && field.key === 'ugelCode' && <p className="text-xs text-muted">Copie el código tal como lo asignó UGEL.</p>}
          {isTitle && !demoFill && !registryForm[field.key] &&
            (field.key === 'referenceResolution' || field.key === 'titleEmissionDate') &&
            preflightDoc?.preflight.fields.filter(({ key, status }) =>
              status === 'READY' && key === (field.key === 'referenceResolution' ? 'document.referenceResolution' : 'document.emissionDate')
            ).map(({ key, value }) => <p key={key} className="text-xs text-muted">Valor usado al imprimir: {value}</p>)}
        </div>
      ))}
    </div>
  );

  // Comprobar compatibilidad con el modo de workspace actual
  const isWorkspaceModeCompatible = useMemo(() => {
    if (!activeWorkspace?.mode) return true;
    const reqMode = activeTemplateMeta.requiredMode;
    if (activeWorkspace.mode === reqMode) return true;
    // Si la plantilla requiere UNIT pero estamos en MODULE, o viceversa
    return false;
  }, [activeWorkspace, activeTemplateMeta]);

  // Generar PDF para un preflight válido (usado por botón principal y recargas automáticas)
  const generatePdfForPreflight = useCallback(
    async (
      targetPreflight: DocumentPreflightResponse,
      overrideOfficial2026?: boolean
    ): Promise<Blob | null> => {
      if (!activeWorkspace?.groupId) return null;
      const targetMeta = getTemplateById(targetPreflight.templateId) || activeTemplateMeta;
      const useOfficial2026 = Boolean(targetMeta.official2026Support)
        ? OFFICIAL_2026_MANDATORY_IDS.has(targetMeta.id)
          ? true
          : (overrideOfficial2026 ?? effectiveOfficial2026)
        : false;

      setIsGeneratingPdf(true);
      const thisSeq = ++pdfSeqRef.current;

      try {
        const payload = {
          groupId: activeWorkspace.groupId,
          templateId: targetPreflight.templateId,
          includeRetired,
          demoFill,
          fingerprint: targetPreflight.fingerprint,
          ...(targetMeta.official2026Support ? { official2026: useOfficial2026 } : {}),
          ...(targetMeta.scope === 'Unidad' ? { unit: selectedUnit } : {}),
          ...(targetMeta.isIndividual && selectedEnrollmentId
            ? { enrollmentId: selectedEnrollmentId }
            : {}),
        };

        const blob = await apiClient.getDocumentPdf(payload);

        if (thisSeq !== pdfSeqRef.current) return null;

        setPdfBlob(blob);
        setFeedback({
          type: 'success',
          message: `PDF generado con éxito mediante el motor institucional CEPRO_MICAELA 2.0 (${(blob.size / 1024).toFixed(1)} KB).`,
        });

        // Actualizar historial de emisiones si la sección está desplegada
        if (isEmissionsExpanded) {
          loadEmissions();
        }
        return blob;
      } catch (err: unknown) {
        if (thisSeq !== pdfSeqRef.current) return null;
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
        return null;
      } finally {
        if (thisSeq === pdfSeqRef.current) {
          setIsGeneratingPdf(false);
        }
      }
    },
    [
      activeWorkspace,
      activeTemplateMeta,
      effectiveOfficial2026,
      includeRetired,
      demoFill,
      selectedUnit,
      selectedEnrollmentId,
      isEmissionsExpanded,
      loadEmissions,
    ]
  );

  // 2. Ejecutar validación preflight oficial (POST /api/document)
  const executePreflight = useCallback(
    async (
      targetTemplateId = selectedTemplateId,
      targetUnit = selectedUnit,
      overrideOfficial2026?: boolean
    ) => {
      if (!activeWorkspace?.groupId) return null;
      const targetMeta = getTemplateById(targetTemplateId) || activeTemplateMeta;
      if (targetMeta.id === 'TMPL-21' && !selectedEnrollmentId) return null;
      const useOfficial2026 = Boolean(targetMeta.official2026Support)
        ? OFFICIAL_2026_MANDATORY_IDS.has(targetMeta.id)
          ? true
          : (overrideOfficial2026 ?? effectiveOfficial2026)
        : false;

      setIsPreflighting(true);
      setFeedback(null);
      const thisSeq = ++preflightSeqRef.current;

      try {
        const payload = {
          groupId: activeWorkspace.groupId,
          templateId: targetTemplateId,
          includeRetired,
          demoFill,
          ...(targetMeta.official2026Support ? { official2026: useOfficial2026 } : {}),
          ...(targetMeta.scope === 'Unidad' ? { unit: targetUnit } : {}),
          ...(targetMeta.isIndividual && selectedEnrollmentId
            ? { enrollmentId: selectedEnrollmentId }
            : {}),
        };

        const result = await apiClient.getDocumentPreflight(payload);

        if (thisSeq !== preflightSeqRef.current) return null;

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

        if (shouldRegeneratePreviewRef.current) {
          shouldRegeneratePreviewRef.current = false;
          await generatePdfForPreflight(result, useOfficial2026);
        }

        return result;
      } catch (err: unknown) {
        if (thisSeq !== preflightSeqRef.current) return null;
        shouldRegeneratePreviewRef.current = false;
        const apiErr = err as ApiError;
        setPreflightDoc(null);
        setFeedback({
          type: 'error',
          message: apiErr?.error || 'Error al validar los parámetros del documento en el servidor.',
        });
        return null;
      } finally {
        if (thisSeq === preflightSeqRef.current) {
          setIsPreflighting(false);
        }
      }
    },
    [
      activeWorkspace,
      selectedTemplateId,
      selectedUnit,
      selectedEnrollmentId,
      includeRetired,
      demoFill,
      effectiveOfficial2026,
      activeTemplateMeta,
      generatePdfForPreflight,
    ]
  );

  // 3. Generar archivo binario PDF mediante el motor original (POST /api/document/pdf)
  const handleGeneratePdf = async () => {
    if (isTitle && registryDirty && !demoFill) {
      setFeedback({ type: 'error', message: 'Guarde los datos del título antes de abrir la vista de impresión.' });
      return;
    }
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

    setFeedback(null);
    await generatePdfForPreflight(currentPreflight);
  };

  // Alternar Formato Oficial 2026 y actualizar preflight/vista previa automáticamente
  const handleToggleOfficial2026 = (nextValue: boolean) => {
    if (isOfficial2026Mandatory) return;
    if (pdfBlob) {
      shouldRegeneratePreviewRef.current = true;
      setPdfBlob(null);
    }
    setOfficial2026(nextValue);
  };

  // Autogenerar Código Institucional y N° de Resolución Directoral 2026
  const handleSuggestRegistryCodes = async () => {
    if (!activeWorkspace?.groupId || !selectedEnrollmentId || !canAutoSuggestRegistry) return;
    setIsSuggestingRegistry(true);
    setRegistryNotice(null);
    try {
      const suggestion = await apiClient.suggestDocumentRegisterCode({
        groupId: activeWorkspace.groupId,
        templateId: activeTemplateMeta.id,
        enrollmentId: selectedEnrollmentId,
        emissionYear:
          (isCertificate ? registryForm.certCodeYear : registryForm.registryCodeYear) ||
          activeWorkspace.year ||
          String(new Date().getFullYear()),
        dni:
          selectedEnrollmentItem?.document && selectedEnrollmentItem.document !== 'S/D'
            ? selectedEnrollmentItem.document
            : undefined,
        demoMode: demoFill || systemStatus?.demonstration === true,
        levelCode: isCertificate
          ? (registryForm.certLevelCode || 'AT')
          : isTitle
          ? (registryForm.registryLevelCode || 'AT')
          : (registryForm.registryLevelCode || undefined),
        programAcronym: (isCertificate ? registryForm.certProgramAcronym : registryForm.programAcronym) || undefined,
        shortRef: (isCertificate ? registryForm.certShortRef : registryForm.registryShortRef) || undefined,
        codeYear: (isCertificate ? registryForm.certCodeYear : registryForm.registryCodeYear) || undefined,
        forceNext: isTitle || isCertificate,
      });

      const allowedKeys = new Set(editableRegistryPanelFields.map((f) => f.key));
      setRegistryForm((prev) => ({
        ...prev,
        ...(isCertificate
          ? {
              ...(allowedKeys.has('certRegisterCode') ? { certRegisterCode: suggestion.registerCode } : {}),
              ...(allowedKeys.has('certCorrelative') && suggestion.correlativeFormatted
                ? { certCorrelative: suggestion.correlativeFormatted }
                : {}),
              ...(allowedKeys.has('certLevelCode') && suggestion.levelCode
                ? { certLevelCode: suggestion.levelCode }
                : {}),
              ...(allowedKeys.has('certProgramAcronym') && suggestion.programAcronym
                ? { certProgramAcronym: suggestion.programAcronym }
                : {}),
              ...(allowedKeys.has('certShortRef') && suggestion.shortRef
                ? { certShortRef: suggestion.shortRef }
                : {}),
              ...(allowedKeys.has('certCodeYear') && suggestion.codeYear
                ? { certCodeYear: suggestion.codeYear }
                : {}),
              ...(allowedKeys.has('certReferenceResolution') && suggestion.referenceResolution && !prev.certReferenceResolution
                ? { certReferenceResolution: suggestion.referenceResolution }
                : {}),
            }
          : {
              ...(allowedKeys.has('registerCode') ? { registerCode: suggestion.registerCode } : {}),
              ...(!isTitle && allowedKeys.has('resolutionNumber')
                ? { resolutionNumber: suggestion.resolutionNumber }
                : {}),
              ...(allowedKeys.has('registryCorrelative') && suggestion.correlativeFormatted
                ? { registryCorrelative: suggestion.correlativeFormatted }
                : {}),
              ...(allowedKeys.has('registryLevelCode') && suggestion.levelCode
                ? { registryLevelCode: suggestion.levelCode }
                : {}),
              ...(allowedKeys.has('programAcronym') && suggestion.programAcronym
                ? { programAcronym: suggestion.programAcronym }
                : {}),
              ...(allowedKeys.has('registryShortRef') && suggestion.shortRef
                ? { registryShortRef: suggestion.shortRef }
                : {}),
              ...(allowedKeys.has('registryCodeYear') && suggestion.codeYear
                ? { registryCodeYear: suggestion.codeYear }
                : {}),
              ...(!isTitle && allowedKeys.has('referenceResolution') && suggestion.referenceResolution
                ? { referenceResolution: suggestion.referenceResolution }
                : {}),
            }),
      }));
      setRegistryDirty(true);
      setRegistryNotice({
        type: 'info',
        message: isCertificate
          ? `Siguiente correlativo de Certificado sugerido (#${suggestion.correlativeFormatted}). Revise la fecha, semestre e institución antes de guardar.`
          : isTitle
          ? `Siguiente correlativo disponible sugerido (#${suggestion.correlativeFormatted}). Revise el Código UGEL y la fecha antes de guardar.`
          : `Sugerencia generada (correlativo #${suggestion.correlative} · ingreso ${suggestion.intakeYear} / emisión ${suggestion.emissionYear}). Haga clic en "Guardar datos registrales" para aplicar.`,
      });
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setRegistryNotice({
        type: 'error',
        message:
          apiErr?.error || 'No se pudo sugerir el código institucional ni el N° de Resolución.',
      });
    } finally {
      setIsSuggestingRegistry(false);
    }
  };

  // Guardar datos registrales autorizados y recargar preflight / vista previa
  const handleSaveRegistryData = async (emitAfterSave = false) => {
    if (!selectedEnrollmentId || editableRegistryPanelFields.length === 0) return;

    const preparedForm = { ...registryForm };
    if (isTitle && preparedForm.registryCorrelative) {
      preparedForm.registerCode = assembleInstitutionalRegisterCode(
        preparedForm,
        selectedEnrollmentItem?.document
      );
    }
    if (isCertificate && preparedForm.certCorrelative) {
      preparedForm.certRegisterCode = assembleInstitutionalRegisterCode(
        {
          registryCorrelative: preparedForm.certCorrelative,
          registryLevelCode: preparedForm.certLevelCode || 'AT',
          programAcronym: preparedForm.certProgramAcronym,
          registryShortRef: preparedForm.certShortRef,
          registryCodeYear: preparedForm.certCodeYear,
        },
        selectedEnrollmentItem?.document
      );
    }

    const fieldsToSave: Record<string, string> = {};
    const titleCode = (preparedForm.registerCode || '').trim();
    const savedCode = currentRegistryRecord?.fields?.registerCode || '';
    if (isTitle && titleCode !== savedCode && !/^\d{6}-[A-Z0-9]{2,4}-\d{8}-[A-Z]{2,6}\d{2}-[1-9]\d{3}$/i.test(titleCode)) {
      setRegistryNotice({
        type: 'error',
        message:
          'Complete el número correlativo (6 dígitos), iniciales de carrera, año de término (2 dígitos), año de trámite (4 dígitos) y verifique que el estudiante tenga DNI de 8 dígitos.',
      });
      return;
    }
    const certCode = (preparedForm.certRegisterCode || '').trim();
    const savedCertCode = currentRegistryRecord?.fields?.certRegisterCode || '';
    if (isCertificate && certCode !== savedCertCode && !/^\d{6}-[A-Z0-9]{2,4}-\d{8}-[A-Z]{2,6}\d{2}-[1-9]\d{3}$/i.test(certCode)) {
      setRegistryNotice({
        type: 'error',
        message:
          'Complete el correlativo del certificado (6 dígitos), iniciales de carrera, año de término (2 dígitos), año de trámite (4 dígitos) y verifique que el estudiante tenga DNI de 8 dígitos.',
      });
      return;
    }
    for (const field of editableRegistryPanelFields) {
      fieldsToSave[field.key] = (preparedForm[field.key] ?? '').trim();
    }

    setIsSavingRegistry(true);
    setRegistryNotice(null);
    try {
      const savedRecord = await apiClient.saveDocumentConfiguration({
        scope: {
          kind: 'registry',
          target: selectedEnrollmentId,
        },
        fields: fieldsToSave,
        rev: currentRegistryRecord?.rev || null,
      });

      setRegistryDirty(false);
      setDocConfig((prev) => {
        if (!prev) return prev;
        const idx = prev.settings.findIndex((s) => s.id === savedRecord.id);
        const updated = [...prev.settings];
        if (idx >= 0) updated[idx] = savedRecord;
        else updated.push(savedRecord);
        return { ...prev, settings: updated };
      });

      const hadPreview = Boolean(pdfBlob);
      if (hadPreview && !emitAfterSave) {
        shouldRegeneratePreviewRef.current = true;
        setPdfBlob(null);
      }
      const nextPreflight = await executePreflight(selectedTemplateId, selectedUnit);
      if (emitAfterSave && nextPreflight) {
        if (!nextPreflight.preflight?.complete && !demoFill) {
          setRegistryNotice({
            type: 'info',
            message: isCertificate
              ? 'Datos guardados, pero revise los requisitos pendientes en el Checklist Preflight antes de imprimir el certificado modular.'
              : 'Datos guardados, pero revise los requisitos pendientes en el Checklist Preflight antes de imprimir el título oficial.',
          });
          return;
        }
        await generatePdfForPreflight(nextPreflight, true);
        setRegistryNotice({
          type: 'success',
          message: isCertificate
            ? 'Certificado modular guardado y emitido en base de datos como copia fiel. Ya puede imprimir o descargar duplicados.'
            : 'Título guardado y emitido en base de datos como copia fiel. Ya puede imprimir o descargar duplicados.',
        });
      } else {
        setRegistryNotice({
          type: 'success',
          message: 'Datos registrales guardados. Recargando validación preflight y vista previa…',
        });
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr?.status === 409) {
        await loadConfiguration();
        setRegistryNotice({
          type: 'error',
          message:
            apiErr?.error || 'El registro cambió. Revise la versión actual y vuelva a guardar.',
        });
      } else {
        setRegistryNotice({
          type: 'error',
          message: apiErr?.error || 'No se pudieron guardar los datos registrales.',
        });
      }
    } finally {
      setIsSavingRegistry(false);
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

    shouldRegeneratePreviewRef.current = false;
    if (tmpl.id === 'TMPL-21' && selectedTemplateId !== tmpl.id) {
      setSelectedEnrollmentId('');
      setStudentSearch('');
      setIsEmissionsExpanded(true);
      setEmissionsGlobalScope(true);
      setEmissionsTemplateFilter('SELECTED');
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

  // Ejecutar preflight automáticamente al seleccionar plantilla o cambiar de unidad/estudiante/2026
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
    effectiveOfficial2026,
    isWorkspaceModeCompatible,
    executePreflight,
  ]);

  // Historial filtrado por plantilla seleccionada o todas
  const visibleEmissions = useMemo(() => {
    if (emissionsTemplateFilter === 'SELECTED') {
      return emissions.filter((item) => item.templateId === selectedTemplateId);
    }
    return emissions;
  }, [emissions, emissionsTemplateFilter, selectedTemplateId]);

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
        <div className="w-10 h-10 border-4 border-brand/20 border-t-brand rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-ink">Cargando Centro de Documentos Académicos…</p>
        <span className="text-xs text-muted mt-1 tabular-nums">
          Consultando catálogo de formatos oficiales y motor PDF local
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
        <DashboardPhotoBand as="header" scene="archivo" contentClassName="text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-soft text-brand flex items-center justify-center mx-auto mb-4 border border-line">
            <DocumentIcon className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-ink tracking-tight">
            Centro de Documentos Académicos
          </h1>
          <p className="text-xs text-muted mt-2 leading-relaxed">
            {user?.role === 'DOCENTE'
              ? 'Para consultar los documentos oficiales de su aula y unidad didáctica asignada, validar requisitos preflight y generar formatos en PDF, seleccione primero su aula y espacio de trabajo.'
              : 'Para consultar las plantillas oficiales, validar requisitos preflight y generar documentos en PDF con el motor institucional, seleccione primero un aula y unidad.'}
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
              className="min-h-[44px] px-6 py-2.5 rounded-[10px] bg-brand text-on-brand font-bold text-xs hover:bg-brand/90 transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-brand cursor-pointer"
            >
              Seleccionar Aula y Espacio
            </button>
          </div>
        </DashboardPhotoBand>

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
      <DashboardPhotoBand as="header" scene="archivo" contentClassName="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <a href="#/inicio" className="hover:text-brand transition-colors">
              Inicio
            </a>
            <span aria-hidden="true">/</span>
            <span className="text-ink font-bold">Documentos</span>
            <span aria-hidden="true">/</span>
            <span className="text-brand font-bold truncate">
              {user?.role === 'DIRECTOR'
                ? hasExtendedCatalog
                  ? 'Catálogo Oficial 2026 (23 Formatos)'
                  : 'Catálogo Oficial de 21 Formatos'
                : 'Formatos Oficiales del Aula'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <h1 className="text-[24px] sm:text-[30px] leading-tight font-bold text-ink tracking-tight flex items-center gap-2 min-w-0">
              <span className="w-3 h-3 rounded-full bg-brand shrink-0" aria-hidden="true" />
              <span className="truncate">Centro de Documentos Académicos</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-soft text-brand border border-brand/20 truncate max-w-full">
              Aula: {currentGroup?.name || 'Aula Asignada'} · {formatScopeHumanLabel(activeWorkspace.mode)}
              {activeWorkspace.unit ? ` (${activeWorkspace.unit})` : ''}
            </span>
            {!__IS_INSTITUTIONAL__ && isDemoActive && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-500/40 uppercase tracking-wider">
                Entorno de Pruebas · Sin Validez Oficial
              </span>
            )}
          </div>

          <p className="text-xs text-muted">
            {user?.role === 'DOCENTE'
              ? 'Formatos normados por el MINEDU asignados a su aula y unidad · Generación mediante el motor PDF oficial de CEPRO_MICAELA 2.0'
              : 'Emisión y verificación de los formatos normados por el MINEDU · Generación mediante el motor PDF oficial de CEPRO_MICAELA 2.0'}
          </p>
        </div>

        {/* Acciones de cabecera y enlaces rápidos */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (modalTargetGroup) setIsUnitModalOpen(true);
            }}
            className="min-h-[44px] inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] bg-surface-alt border border-line hover:bg-brand-soft text-ink hover:text-brand text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-brand cursor-pointer"
            title="Cambiar aula o unidad activa"
          >
            <FolderOpenIcon className="w-4 h-4 text-brand" />
            <span>Cambiar Aula / Unidad</span>
          </button>

          <a
            href="#/configuracion-documental"
            className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] bg-surface-alt border border-line hover:bg-brand-soft text-ink hover:text-brand text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-brand"
            title="Consultar datos institucionales y parámetros de las unidades"
          >
            <DocConfigIcon className="w-4 h-4 text-brand" />
            <span>Configurar Parámetros</span>
          </a>
        </div>
      </DashboardPhotoBand>

      {/* 1.5 Contexto Académico de Unidad Activa y Conmutador Rápido */}
      <ActiveUnitContextBanner variant="full" />

      {/* 2. Banner de advertencia de modo de workspace incompatible */}
      {!isWorkspaceModeCompatible && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950 dark:text-amber-200 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-200 flex items-center justify-center shrink-0" aria-hidden="true">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="text-xs min-w-0">
              <strong className="font-bold text-sm block">
                Este formato requiere {formatScopeHumanLabel(activeTemplateMeta.requiredMode).replace('Alcance: ', '')}
              </strong>
              <span>
                La plantilla seleccionada (<strong>{activeTemplateMeta.name}</strong>) tiene{' '}
                <strong>{formatScopeHumanLabel(activeTemplateMeta.scope)}</strong>, mientras que el espacio activo está
                en <strong>{formatModeShortLabel(activeWorkspace.mode)}</strong>. Active el alcance requerido con un clic:
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleSwitchWorkspaceMode(activeTemplateMeta.requiredMode)}
            className="min-h-[44px] px-4 py-2 rounded-[10px] bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shadow-sm shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand"
          >
            Cambiar a {formatModeShortLabel(activeTemplateMeta.requiredMode)}
          </button>
        </div>
      )}

      {/* 3. Notificación de estado / feedback */}
      {feedback && (
        <div
          role={feedback.type === 'error' ? 'alert' : 'status'}
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-200'
              : feedback.type === 'warning'
              ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-950 dark:text-amber-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-950 dark:text-rose-200'
          }`}
        >
          <span className="flex items-center gap-2 min-w-0">
            <span className="font-bold shrink-0" aria-hidden="true">
              {feedback.type === 'success' ? '✓' : feedback.type === 'warning' ? '⚠' : '!'}
            </span>
            <span className="min-w-0">{feedback.message}</span>
          </span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-[10px] text-muted hover:text-ink p-1 text-sm font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-brand"
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
          <div className="bg-surface rounded-2xl p-5 border border-line shadow-[var(--ui-shadow)] space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3 gap-2">
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-ink tracking-tight">Catálogo de Formatos</h2>
                <span className="text-[11px] text-muted tabular-nums">
                  {user?.role === 'DIRECTOR'
                    ? hasExtendedCatalog
                      ? '21 plantillas MINEDU + 2 extensiones 2026'
                      : '21 plantillas oficiales del MINEDU'
                    : `${contextTemplates.length} formatos pertinentes para su rol y aula`}
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-surface-alt border border-line text-ink tabular-nums shrink-0">
                {filteredCatalog.length} / {contextTemplates.length}
              </span>
            </div>

            {/* Buscador de plantillas */}
            <div className="relative">
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Buscar por nombre o formato…"
                aria-label="Buscar formato por nombre o código"
                className="w-full min-h-[44px] pl-9 pr-3 py-2 text-xs rounded-[10px] border border-line bg-surface-alt text-ink focus:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              />
              <svg
                className="w-4 h-4 text-muted absolute left-3 top-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35" />
              </svg>
            </div>

            {/* Filtro por Categorías con documentos visibles */}
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => setSelectedCategory('TODOS')}
                className={`min-h-[44px] px-3 py-1 rounded-[10px] font-bold transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-brand ${
                  selectedCategory === 'TODOS'
                    ? 'bg-brand text-on-brand shadow-xs'
                    : 'bg-surface-alt border border-line text-muted hover:text-ink hover:bg-brand-soft'
                }`}
              >
                Todos
              </button>
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`min-h-[44px] px-3 py-1 rounded-[10px] font-bold transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-brand ${
                    selectedCategory === cat
                      ? 'bg-brand text-on-brand shadow-xs'
                      : 'bg-surface-alt border border-line text-muted hover:text-ink hover:bg-brand-soft'
                  }`}
                >
                  {formatCategoryFilterLabel(cat)}
                </button>
              ))}
            </div>

            {/* Lista interactiva de plantillas */}
            <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-1">
              {filteredCatalog.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted bg-surface-alt rounded-2xl border border-line">
                  No se encontraron formatos coincidentes con los filtros aplicados.
                </div>
              ) : (
                filteredCatalog.map((tmpl) => {
                  const isSelected = selectedTemplateId === tmpl.id;
                  const isCompatible =
                    !activeWorkspace.mode || activeWorkspace.mode === tmpl.requiredMode;

                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => handleSelectTemplate(tmpl)}
                      aria-pressed={isSelected}
                      className={`w-full min-h-[44px] text-left p-3 rounded-2xl border transition-all flex items-start gap-2.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand ${
                        isSelected
                          ? 'bg-brand-soft border-brand shadow-xs ring-1 ring-brand'
                          : 'bg-surface border-line hover:bg-surface-alt hover:border-brand/40'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 font-bold text-[11px] tabular-nums ${
                          isSelected
                            ? 'bg-brand text-on-brand'
                            : 'bg-surface-alt border border-line text-ink'
                        }`}
                      >
                        {tmpl.number}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                          <span className="block break-words text-sm font-bold leading-snug text-ink">
                            {tmpl.name}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {tmpl.official2026Support && (
                              <span className="px-1.5 py-0.5 rounded bg-brand-soft text-brand border border-brand/20 text-[10px] font-bold tabular-nums">
                                2026
                              </span>
                            )}
                            <span className="text-xs font-semibold tabular-nums text-muted">
                              {tmpl.id}
                            </span>
                          </div>
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                          <span className="text-muted">{formatCategoryBadge(tmpl.category)}</span>
                          <span className="text-muted" aria-hidden="true">·</span>
                          <span
                            className={`font-semibold ${
                              isCompatible ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            {formatScopeHumanLabel(tmpl.scope)}
                          </span>
                        </div>

                        <p className="mt-1.5 break-words text-xs leading-relaxed text-muted">
                          {tmpl.description}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Columna Derecha: Parámetros del Documento, Checklist Preflight y Visor PDF (8 columnas lg) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Tarjeta de Configuración y Parámetros del Formato Seleccionado */}
          <section
            aria-labelledby="selected-document-title"
            className="min-w-0 space-y-5 rounded-2xl border border-line bg-surface p-4 shadow-[var(--ui-shadow)] sm:p-6"
          >
            <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span className="rounded-md bg-brand-soft px-2 py-1 font-semibold text-brand tabular-nums">
                    {activeTemplateMeta.id}
                  </span>
                  {supportsOfficial2026 && effectiveOfficial2026 && (
                    <span className="rounded-md bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 tabular-nums">
                      Oficial 2026
                    </span>
                  )}
                  <span className="tabular-nums">
                    {activeTemplateMeta.paperFormat} · {activeTemplateMeta.pageCount ?? activeTemplateMeta.pagesCount} pág.
                  </span>
                </div>
                <h2 id="selected-document-title" className="break-words text-xl font-bold leading-snug tracking-tight text-ink">
                  {activeTemplateMeta.name}
                </h2>
                <p className="mt-1 max-w-prose break-words text-sm leading-relaxed text-muted">
                  {activeTemplateMeta.description}
                </p>
              </div>

              <button
                type="button"
                id="document-generate"
                onClick={handleGeneratePdf}
                disabled={isGeneratingPdf || isPreflighting || (isTitle && (!selectedEnrollmentId || (registryDirty && !demoFill)))}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-brand px-4 py-2.5 text-sm font-semibold text-on-brand transition-colors hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-50 sm:w-auto cursor-pointer"
              >
                {isGeneratingPdf ? (
                  <>
                    <span aria-hidden="true" className="size-4 rounded-full border-2 border-on-brand/30 border-t-on-brand motion-safe:animate-spin" />
                    <span>Generando PDF…</span>
                  </>
                ) : (
                  <>
                    <span aria-hidden="true"><DocumentIcon className="size-4" /></span>
                    <span>{isTitle ? 'Vista de impresión' : 'Ver formato rellenado'}</span>
                  </>
                )}
              </button>
            </header>

            <fieldset className="min-w-0">
              <legend className="mb-3 text-sm font-bold text-ink">Datos del formato</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <dl className="min-w-0">
                  <dt className="mb-1.5 text-sm font-semibold text-ink">Grupo / Aula</dt>
                  <dd className="min-h-11 break-words rounded-[10px] border border-line bg-surface-alt px-3 py-2.5 text-sm font-medium text-ink">
                    {currentGroup?.name || 'Aula no seleccionada'}
                  </dd>
                </dl>

                {/* Selector de Unidad Didáctica (si aplica para asistencia o evaluación) */}
                {activeTemplateMeta.scope === 'Unidad' && (
                  <div className="min-w-0">
                    <label htmlFor="select-unit" className="mb-1.5 block text-sm font-semibold text-ink">
                      Unidad didáctica
                    </label>
                    <select
                      id="select-unit"
                      value={selectedUnit}
                      onChange={(e) => setSelectedUnit(e.target.value)}
                      className="min-h-11 w-full min-w-0 rounded-[10px] border border-line bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      {availableUnits.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Buscador rápido por DNI o apellidos + Selector de Estudiante (TMPL-02, 20, 21, 22, 23) */}
                {activeTemplateMeta.isIndividual && (
                  <div className="min-w-0 space-y-2 sm:col-span-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label htmlFor="search-enrollment" className="block text-sm font-semibold text-ink">
                        Buscar estudiante por DNI o Apellidos
                      </label>
                      <span className="text-[11px] text-muted tabular-nums">
                        {filteredRosterEnrollments.length} de {rosterEnrollments.length} matrícula(s)
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        id="search-enrollment"
                        type="text"
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder="Filtrar por DNI o apellidos (ej. 72345678 o Quispe)…"
                        aria-label="Buscar estudiante por DNI o apellidos"
                        className="min-h-11 w-full rounded-[10px] border border-line bg-surface-alt pl-9 pr-9 py-2 text-sm text-ink focus:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      />
                      <SearchIcon className="w-4 h-4 text-muted absolute left-3 top-3.5 pointer-events-none" />
                      {studentSearch && (
                        <button
                          type="button"
                          onClick={() => setStudentSearch('')}
                          aria-label="Limpiar búsqueda de estudiante"
                          className="absolute right-2 top-1.5 min-h-[32px] min-w-[32px] rounded-lg text-xs font-bold text-muted hover:text-ink hover:bg-surface cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div>
                      <label htmlFor="select-enrollment" className="mb-1.5 block text-sm font-semibold text-ink">
                        Estudiante / Matrícula
                      </label>
                      <select
                        id="select-enrollment"
                        value={selectedEnrollmentId}
                        disabled={isSavingRegistry || isSuggestingRegistry}
                        onChange={(e) => {
                          ++preflightSeqRef.current;
                          ++pdfSeqRef.current;
                          shouldRegeneratePreviewRef.current = false;
                          setPdfBlob(null);
                          setPreflightDoc(null);
                          setFeedback(null);
                          setIsGeneratingPdf(false);
                          setIsPreflighting(false);
                          setSelectedEnrollmentId(e.target.value);
                          setStudentSearch('');
                        }}
                        className="min-h-11 w-full min-w-0 rounded-[10px] border border-line bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      >
                        {!selectedEnrollmentItem && <option value="">Seleccione un estudiante</option>}
                        {selectedEnrollmentItem && !filteredRosterEnrollments.some(en => en.id === selectedEnrollmentId) && (
                          <option value={selectedEnrollmentId}>{selectedEnrollmentItem.name} · {selectedEnrollmentItem.document} (selección actual)</option>
                        )}
                        {filteredRosterEnrollments.map(en => (
                          <option key={en.id} value={en.id}>{en.name} · {en.document}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </fieldset>

            <fieldset className="min-w-0">
              <legend className="mb-3 text-sm font-bold text-ink">Opciones del formato</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                <label htmlFor="include-retired" className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[10px] border border-line bg-surface-alt px-3 py-2 text-sm font-medium text-ink">
                  <input
                    type="checkbox"
                    id="include-retired"
                    checked={includeRetired}
                    onChange={(e) => setIncludeRetired(e.target.checked)}
                    className="size-4 shrink-0 rounded border-line accent-[var(--ui-brand)] focus-visible:ring-2 focus-visible:ring-brand"
                  />
                  <span>Incluir historial (retirados)</span>
                </label>

                {supportsOfficial2026 && (
                  <label
                    htmlFor="official-2026-toggle"
                    className={`flex min-h-11 items-start gap-3 rounded-[10px] border px-3 py-2 text-sm ${
                      isOfficial2026Mandatory
                        ? 'cursor-default border-brand/30 bg-brand-soft/60 text-ink'
                        : 'cursor-pointer border-brand/30 bg-brand-soft/40 text-ink'
                    }`}
                  >
                    <input
                      type="checkbox"
                      id="official-2026-toggle"
                      checked={effectiveOfficial2026}
                      disabled={isOfficial2026Mandatory}
                      onChange={(e) => handleToggleOfficial2026(e.target.checked)}
                      className="mt-0.5 size-4 shrink-0 rounded border-line accent-[var(--ui-brand)] focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-80"
                    />
                    <span>
                      <span className="block font-semibold">Formato Oficial 2026</span>
                      <span className="block text-xs text-muted">
                        {isOfficial2026Mandatory
                          ? (isCertificate
                            ? 'Obligatorio para Certificado Modular Oficial 2026 (emisión por módulo).'
                            : 'Obligatorio para emisión oficial 2026 (trayectoria M1 + M2).')
                          : 'Aplica disposición oficial 2026 y validaciones de registro UGEL.'}
                      </span>
                    </span>
                  </label>
                )}

                {/* Checkbox: Modo Demostración (solo en pruebas / desarrollo) */}
                {!__IS_INSTITUTIONAL__ && (
                  <label htmlFor="demo-fill" className="flex min-h-11 cursor-pointer items-start gap-3 rounded-[10px] border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                    <input
                      type="checkbox"
                      id="demo-fill"
                      checked={demoFill}
                      onChange={(e) => setDemoFill(e.target.checked)}
                      className="mt-0.5 size-4 shrink-0 rounded accent-[var(--ui-brand)] focus-visible:ring-2 focus-visible:ring-brand"
                    />
                    <span>
                      <span className="block font-semibold">Modo Demostración (simular datos)</span>
                      <span className="block text-xs">Formato de prueba sin validez oficial.</span>
                    </span>
                  </label>
                )}
              </div>
            </fieldset>

            {/* Resumen de trayectoria M1 + M2 cuando el backend lo retorna (TMPL-20, 21, 22, 23) */}
            {isCertificationTemplate && preflightDoc?.trajectory && (
              <div
                className={`rounded-xl border p-3.5 text-xs space-y-1.5 ${
                  preflightDoc.trajectory.hasBothModules
                    ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200'
                    : 'border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="font-bold">
                    Trayectoria Formativa del Programa (M1 + M2)
                  </strong>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold border border-current/20 tabular-nums">
                    {preflightDoc.trajectory.totalHours} h · {preflightDoc.trajectory.totalCredits} cr
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  {preflightDoc.trajectory.hasBothModules
                    ? `Completa: ${preflightDoc.trajectory.module1?.moduleName || 'Módulo I'} (${preflightDoc.trajectory.module1?.hours ?? 0} h) + ${preflightDoc.trajectory.module2?.moduleName || 'Módulo II'} (${preflightDoc.trajectory.module2?.hours ?? 0} h).`
                    : `Incompleta: falta ${(preflightDoc.trajectory.missingModules || ['Módulo I', 'Módulo II']).join(' y ')} para emisión oficial de título/egreso.`}
                </p>
              </div>
            )}

            {/* Panel compacto: Datos Registrales y Autogeneración 2026 (TMPL-20, 21, 22, 23) */}
            {isCertificationTemplate &&
              activeTemplateMeta.isIndividual &&
              selectedEnrollmentId &&
              editableRegistryPanelFields.length > 0 && (
                <section
                  aria-labelledby="registry-autogeneration-title"
                  className="rounded-xl border border-line bg-surface-alt p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
                    <div className="min-w-0">
                      <h3
                        id="registry-autogeneration-title"
                        className="text-sm font-bold text-ink flex items-center gap-2"
                      >
                        <KeyIcon className="w-4 h-4 text-brand shrink-0" />
                        <span>
                          {isTitle
                            ? 'Datos del título'
                            : isCertificate
                            ? 'Datos del Certificado Modular'
                            : 'Datos registrales'}
                        </span>
                      </h3>
                      <p className="text-[11px] text-muted mt-0.5">
                        {selectedEnrollmentItem
                          ? `Matrícula activa: ${selectedEnrollmentItem.name} (DNI: ${selectedEnrollmentItem.document})`
                          : 'Edición directa del registro de certificación/titulación'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {canAutoSuggestRegistry && (
                        <button
                          type="button"
                          id="btn-suggest-registry"
                          onClick={handleSuggestRegistryCodes}
                          disabled={isSuggestingRegistry || isSavingRegistry}
                          className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-surface border border-brand/40 text-brand hover:bg-brand-soft text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand"
                        >
                          <RefreshIcon
                            className={`w-3.5 h-3.5 ${isSuggestingRegistry ? 'animate-spin' : ''}`}
                          />
                          <span>
                            {isSuggestingRegistry
                              ? 'Generando…'
                              : isCertificate
                              ? 'Sugerir correlativo de Certificado'
                              : isTitle
                              ? 'Sugerir siguiente correlativo'
                              : 'Autogenerar Código y N° RD'}
                          </span>
                        </button>
                      )}
                      <button
                        type="button"
                        id="btn-save-registry"
                        onClick={() => handleSaveRegistryData(false)}
                        disabled={isSavingRegistry || isSuggestingRegistry}
                        className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] bg-surface border border-brand/40 hover:bg-brand-soft text-brand text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand"
                      >
                        <SaveIcon className="w-3.5 h-3.5" />
                        <span>{isSavingRegistry ? 'Guardando…' : 'Guardar datos'}</span>
                      </button>
                      {(isTitle || isCertificate) && (
                        <button
                          type="button"
                          id="btn-save-emit-title"
                          onClick={() => handleSaveRegistryData(true)}
                          disabled={isSavingRegistry || isSuggestingRegistry || isGeneratingPdf}
                          className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] bg-brand hover:bg-brand/90 text-on-brand text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand"
                        >
                          <DocumentIcon className="w-3.5 h-3.5" />
                          <span>
                            {isGeneratingPdf
                              ? 'Emitiendo…'
                              : isCertificate
                              ? 'Guardar y Emitir Certificado (PDF)'
                              : 'Guardar y Emitir Título (PDF)'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  {registryNotice && (
                    <div
                      role={registryNotice.type === 'error' ? 'alert' : 'status'}
                      className={`p-2.5 rounded-lg text-[11px] font-semibold border ${
                        registryNotice.type === 'success'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                          : registryNotice.type === 'error'
                          ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
                          : 'bg-brand-soft/60 border-brand/25 text-ink'
                      }`}
                    >
                      {registryNotice.message}
                    </div>
                  )}

                  {isTitle ? (() => {
                    const updateTitleField = (key: string, val: string) => {
                      setRegistryForm((prev) =>
                        applyRegistryFieldChange(prev, key, val, selectedEnrollmentItem?.document)
                      );
                      setRegistryDirty(true);
                      setRegistryNotice(null);
                    };
                    const dniVal =
                      selectedEnrollmentItem?.document && selectedEnrollmentItem.document !== 'S/D'
                        ? selectedEnrollmentItem.document.replace(/\D/g, '').padStart(8, '0').slice(-8)
                        : 'PENDIENTE';
                    const assembledCode =
                      registryForm.registryCorrelative
                        ? assembleInstitutionalRegisterCode(
                            registryForm,
                            selectedEnrollmentItem?.document
                          )
                        : registryForm.registerCode || '';
                    const parsedDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(
                      registryForm.titleEmissionDate || ''
                    );
                    const emYear = parsedDate ? parsedDate[1] : String(new Date().getFullYear());
                    const emMonth = parsedDate ? parsedDate[2] : String(new Date().getMonth() + 1).padStart(2, '0');
                    const emDay = parsedDate ? parsedDate[3] : String(new Date().getDate()).padStart(2, '0');
                    const setDateParts = (y: string, m: string, d: string) => {
                      const cleanY = String(y).replace(/\D/g, '').slice(0, 4).padStart(4, '0');
                      const cleanM = String(Math.max(1, Math.min(12, Number(m) || 1))).padStart(2, '0');
                      const maxD = new Date(Number(cleanY) || 2025, Number(cleanM), 0).getDate();
                      const cleanD = String(Math.max(1, Math.min(maxD, Number(d) || 1))).padStart(2, '0');
                      updateTitleField('titleEmissionDate', `${cleanY}-${cleanM}-${cleanD}`);
                    };
                    const fillUgelBase = () => {
                      const corr6 = (registryForm.registryCorrelative || '').replace(/\D/g, '').padStart(6, '0');
                      const lvl = (registryForm.registryLevelCode || 'AT').toUpperCase();
                      const acr = (registryForm.programAcronym || 'CO').toUpperCase();
                      const ref2 = (registryForm.registryShortRef || '24').padStart(2, '0');
                      const yr4 = (registryForm.registryCodeYear || '2025').padStart(4, '0');
                      const sug = `${corr6}-${lvl}-103-${acr}${ref2}-${yr4}`;
                      updateTitleField('ugelCode', sug);
                    };

                    return (
                      <div className="space-y-4">
                        {registryForm.registerCode?.startsWith('REG-') && (
                          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                            El código guardado pertenece a un formato anterior. Complete el correlativo para actualizarlo al formato oficial.
                          </p>
                        )}

                        {/* Vista en vivo del Código Institucional Armado (Texto literal sin código de barras) */}
                        <div className="rounded-xl border border-brand/30 bg-surface p-3.5 space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-brand uppercase tracking-wider">
                              Código de Registro Institucional (Armado Automático)
                            </span>
                            <span className="text-[11px] text-muted">
                              Se imprime en anverso vertical y dos veces en reverso (sin código de barras)
                            </span>
                          </div>
                          <div className="font-mono text-base font-extrabold text-ink tracking-wide tabular-nums">
                            {assembledCode || 'Ingrese N° correlativo inicial (ej. 000174)'}
                          </div>
                        </div>

                        {/* Grid de los 10 Datos del Título */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {/* 1. Correlativo */}
                          <div className="space-y-1">
                            <label htmlFor="title-correlative" className="block text-xs font-bold text-ink">
                              1. N° Correlativo (6 dígitos) *
                            </label>
                            <input
                              id="title-correlative"
                              type="text"
                              inputMode="numeric"
                              maxLength={6}
                              value={registryForm.registryCorrelative ?? ''}
                              onChange={(e) =>
                                updateTitleField('registryCorrelative', e.target.value.replace(/\D/g, '').slice(0, 6))
                              }
                              onBlur={() => {
                                if (registryForm.registryCorrelative) {
                                  updateTitleField(
                                    'registryCorrelative',
                                    registryForm.registryCorrelative.padStart(6, '0')
                                  );
                                }
                              }}
                              placeholder="Ej.: 000174"
                              className="min-h-11 w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-sm font-mono font-bold text-ink tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                            />
                          </div>

                          {/* 2. Grado */}
                          <div className="space-y-1">
                            <label htmlFor="title-level" className="block text-xs font-bold text-ink">
                              2. Grado
                            </label>
                            <select
                              id="title-level"
                              value={registryForm.registryLevelCode || 'AT'}
                              onChange={(e) => updateTitleField('registryLevelCode', e.target.value)}
                              className="min-h-11 w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                            >
                              <option value="AT">AT (Auxiliar Técnico)</option>
                            </select>
                          </div>

                          {/* 3. DNI */}
                          <div className="space-y-1">
                            <label htmlFor="title-dni-readonly" className="block text-xs font-bold text-ink">
                              3. DNI del Estudiante (BD)
                            </label>
                            <input
                              id="title-dni-readonly"
                              type="text"
                              readOnly
                              value={dniVal}
                              className="min-h-11 w-full rounded-[10px] border border-line bg-surface-alt px-3 py-2 text-sm font-mono font-semibold text-muted tabular-nums"
                            />
                          </div>

                          {/* 4. Nombre del estudiante en el título */}
                          <div className="space-y-1 sm:col-span-2">
                            <label htmlFor="title-titulado-name" className="block text-xs font-bold text-ink">
                              4. Nombre en el Título (Century Schoolbook Negrita) *
                            </label>
                            <input
                              id="title-titulado-name"
                              type="text"
                              value={registryForm.tituladoName ?? ''}
                              onChange={(e) => updateTitleField('tituladoName', e.target.value)}
                              placeholder="Ej.: Yanet Braulia, SOTA VELASQUEZ"
                              className="min-h-11 w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                            />
                          </div>

                          {/* 5b. Iniciales carrera */}
                          <div className="space-y-1">
                            <label htmlFor="title-acronym" className="block text-xs font-bold text-ink">
                              5b. Iniciales de Carrera *
                            </label>
                            <input
                              id="title-acronym"
                              type="text"
                              maxLength={6}
                              value={registryForm.programAcronym ?? ''}
                              onChange={(e) =>
                                updateTitleField('programAcronym', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                              }
                              placeholder="Ej.: CO, CI, MA"
                              className="min-h-11 w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-sm font-mono font-bold text-ink uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                            />
                          </div>

                          {/* 5a. Carrera / Título otorgado */}
                          <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                            <label htmlFor="title-program-text" className="block text-xs font-bold text-ink">
                              5a. Título Otorgado (Carrera) *
                            </label>
                            <input
                              id="title-program-text"
                              type="text"
                              value={registryForm.officialTitleText ?? ''}
                              onChange={(e) => updateTitleField('officialTitleText', e.target.value.toUpperCase())}
                              placeholder="Ej.: AUXILIAR TÉCNICO EN COMPUTACIÓN"
                              className="min-h-11 w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-sm font-bold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                            />
                          </div>

                          {/* 6. Año que terminó (2 dígitos) */}
                          <div className="space-y-1">
                            <label htmlFor="title-short-ref" className="block text-xs font-bold text-ink">
                              6. Año en que terminó (2 dígitos) *
                            </label>
                            <input
                              id="title-short-ref"
                              type="text"
                              inputMode="numeric"
                              maxLength={2}
                              value={registryForm.registryShortRef ?? ''}
                              onChange={(e) =>
                                updateTitleField('registryShortRef', e.target.value.replace(/\D/g, '').slice(0, 2))
                              }
                              placeholder="Ej.: 24"
                              className="min-h-11 w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-sm font-mono font-bold text-ink tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                            />
                          </div>

                          {/* 7. Año del trámite (4 dígitos) */}
                          <div className="space-y-1">
                            <label htmlFor="title-process-year" className="block text-xs font-bold text-ink">
                              7. Año del Trámite (4 dígitos) *
                            </label>
                            <input
                              id="title-process-year"
                              type="text"
                              inputMode="numeric"
                              maxLength={4}
                              value={registryForm.registryCodeYear ?? ''}
                              onChange={(e) =>
                                updateTitleField('registryCodeYear', e.target.value.replace(/\D/g, '').slice(0, 4))
                              }
                              placeholder="Ej.: 2025"
                              className="min-h-11 w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-sm font-mono font-bold text-ink tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                            />
                          </div>

                          {/* 8. Código de Registro UGEL */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <label htmlFor="title-ugel-code" className="block text-xs font-bold text-ink">
                                8. Código de Registro UGEL *
                              </label>
                              <button
                                type="button"
                                onClick={fillUgelBase}
                                className="text-[11px] font-bold text-brand hover:underline cursor-pointer"
                              >
                                Armar base UGEL
                              </button>
                            </div>
                            <input
                              id="title-ugel-code"
                              type="text"
                              value={registryForm.ugelCode ?? ''}
                              onChange={(e) => updateTitleField('ugelCode', e.target.value.toUpperCase())}
                              placeholder="Ej.: 000174-AT-103-CO24-2025"
                              className="min-h-11 w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-sm font-mono font-semibold text-ink tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                            />
                          </div>

                          {/* 9. Fecha de expedición (Día, Mes, Año) */}
                          <div className="space-y-1 sm:col-span-2 lg:col-span-3 rounded-xl border border-line bg-surface p-3">
                            <span className="block text-xs font-bold text-ink mb-2">
                              9. Fecha de Expedición (Calibri 16)
                            </span>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label htmlFor="title-date-day" className="block text-[11px] text-muted mb-1">
                                  Día
                                </label>
                                <input
                                  id="title-date-day"
                                  type="number"
                                  min={1}
                                  max={31}
                                  value={Number(emDay)}
                                  onChange={(e) => setDateParts(emYear, emMonth, e.target.value)}
                                  className="min-h-10 w-full rounded-[10px] border border-line bg-surface-alt px-2.5 py-1.5 text-sm font-semibold text-ink tabular-nums"
                                />
                              </div>
                              <div>
                                <label htmlFor="title-date-month" className="block text-[11px] text-muted mb-1">
                                  Mes
                                </label>
                                <select
                                  id="title-date-month"
                                  value={Number(emMonth)}
                                  onChange={(e) => setDateParts(emYear, e.target.value, emDay)}
                                  className="min-h-10 w-full rounded-[10px] border border-line bg-surface-alt px-2.5 py-1.5 text-sm font-semibold text-ink"
                                >
                                  {TITLE_SPANISH_MONTHS.map((mName, idx) => (
                                    <option key={mName} value={idx + 1}>
                                      {mName.charAt(0).toUpperCase() + mName.slice(1)}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label htmlFor="title-date-year" className="block text-[11px] text-muted mb-1">
                                  Año
                                </label>
                                <input
                                  id="title-date-year"
                                  type="number"
                                  min={2000}
                                  max={2100}
                                  value={Number(emYear)}
                                  onChange={(e) => setDateParts(e.target.value, emMonth, emDay)}
                                  className="min-h-10 w-full rounded-[10px] border border-line bg-surface-alt px-2.5 py-1.5 text-sm font-semibold text-ink tabular-nums"
                                />
                              </div>
                            </div>
                            <p className="mt-2 text-xs font-medium text-brand">
                              Texto impreso:{' '}
                              <strong>
                                {formatTitleExpeditionSentence(
                                  registryForm.titleEmissionDate || `${emYear}-${emMonth}-${emDay}`,
                                  'San Miguel'
                                )}
                              </strong>
                            </p>
                          </div>

                          {/* 10. Director y R.D. de Referencia */}
                          <div className="space-y-1 sm:col-span-2">
                            <label htmlFor="title-director" className="block text-xs font-bold text-ink">
                              10. Director Firmante (desde Configuración, modificable)
                            </label>
                            <input
                              id="title-director"
                              type="text"
                              value={registryForm.directorName ?? ''}
                              onChange={(e) => updateTitleField('directorName', e.target.value)}
                              placeholder="Prof. Eloy Valerio Paredes Feliciano"
                              className="min-h-11 w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                            />
                          </div>

                          <div className="space-y-1">
                            <label htmlFor="title-reference-rd" className="block text-xs font-bold text-ink">
                              Resolución Portada (R.D.)
                            </label>
                            <input
                              id="title-reference-rd"
                              type="text"
                              value={registryForm.referenceResolution ?? ''}
                              onChange={(e) => updateTitleField('referenceResolution', e.target.value)}
                              placeholder="Ej.: R.D. Nº 3107-2023-DUGEL-SR"
                              className="min-h-11 w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                            />
                          </div>
                        </div>

                        <details className="rounded-lg border border-line p-3">
                          <summary className="cursor-pointer text-xs font-semibold text-muted">
                            Edición manual directa de código institucional / datos de libro de registro
                          </summary>
                          <div className="mt-3">
                            {renderRegistryFields(
                              editableRegistryPanelFields.filter(
                                (field) =>
                                  field.key === 'registerCode' ||
                                  (!TITLE_MAIN_FIELDS.has(field.key) &&
                                    !TITLE_CODE_PARTS.has(field.key) &&
                                    field.key !== 'tituladoName' &&
                                    field.key !== 'officialTitleText' &&
                                    field.key !== 'directorName')
                              )
                            )}
                          </div>
                        </details>
                        {registryDirty && (
                          <p className="text-xs font-semibold text-brand" role="status">
                            Hay cambios pendientes. Haga clic en &quot;Guardar y Emitir Título (PDF)&quot; para registrar e imprimir.
                          </p>
                        )}
                      </div>
                    );
                  })() : isCertificate ? (() => {
                    const updateCertField = (key: string, val: string) => {
                      setRegistryForm((prev) => {
                        const next = { ...prev, [key]: val };
                        if (key === 'certRegisterCode') {
                          const m = /^(\d{6})-([A-Z0-9]{2,4})-(\d{8})-([A-Z]{2,6})(\d{2})-(\d{4})$/i.exec(
                            val.trim()
                          );
                          if (m) {
                            next.certCorrelative = m[1];
                            next.certLevelCode = m[2].toUpperCase();
                            next.certProgramAcronym = m[4].toUpperCase();
                            next.certShortRef = m[5];
                            next.certCodeYear = m[6];
                          }
                          next.certRegisterCode = val.toUpperCase();
                        } else if (
                          ['certCorrelative', 'certLevelCode', 'certProgramAcronym', 'certShortRef', 'certCodeYear'].includes(key) &&
                          next.certCorrelative
                        ) {
                          next.certRegisterCode = assembleInstitutionalRegisterCode(
                            {
                              registryCorrelative: next.certCorrelative,
                              registryLevelCode: next.certLevelCode || 'AT',
                              programAcronym: next.certProgramAcronym,
                              registryShortRef: next.certShortRef,
                              registryCodeYear: next.certCodeYear,
                            },
                            selectedEnrollmentItem?.document
                          );
                        }
                        return next;
                      });
                      setRegistryDirty(true);
                      setRegistryNotice(null);
                    };
                    const dniVal =
                      selectedEnrollmentItem?.document && selectedEnrollmentItem.document !== 'S/D'
                        ? selectedEnrollmentItem.document.replace(/\D/g, '').padStart(8, '0').slice(-8)
                        : 'PENDIENTE';
                    const assembledCertCode = registryForm.certCorrelative
                      ? assembleInstitutionalRegisterCode(
                          {
                            registryCorrelative: registryForm.certCorrelative,
                            registryLevelCode: registryForm.certLevelCode || 'AT',
                            programAcronym: registryForm.certProgramAcronym,
                            registryShortRef: registryForm.certShortRef,
                            registryCodeYear: registryForm.certCodeYear,
                          },
                          selectedEnrollmentItem?.document
                        )
                      : registryForm.certRegisterCode || '';
                    const parsedDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(
                      registryForm.certEmissionDate || ''
                    );
                    const emYear = parsedDate ? parsedDate[1] : String(new Date().getFullYear());
                    const emMonth = parsedDate ? parsedDate[2] : String(new Date().getMonth() + 1).padStart(2, '0');
                    const emDay = parsedDate ? parsedDate[3] : String(new Date().getDate()).padStart(2, '0');
                    const setCertDateParts = (y: string, m: string, d: string) => {
                      const cleanY = String(y).replace(/\D/g, '').slice(0, 4).padStart(4, '0');
                      const cleanM = String(Math.max(1, Math.min(12, Number(m) || 1))).padStart(2, '0');
                      const maxD = new Date(Number(cleanY) || 2026, Number(cleanM), 0).getDate();
                      const cleanD = String(Math.max(1, Math.min(maxD, Number(d) || 1))).padStart(2, '0');
                      updateCertField('certEmissionDate', `${cleanY}-${cleanM}-${cleanD}`);
                    };
                    const pfUnits = (Array.isArray(preflightDoc?.units) ? preflightDoc.units : []) as Array<{
                      code?: string;
                      credits?: number;
                      hours?: number;
                    }>;
                    const pfNonEfsrtUnits = pfUnits.filter(
                      (u) => String(u.code || '').toUpperCase() !== 'EFSRT'
                    );
                    const sumUnitCredits = pfNonEfsrtUnits.reduce((s, u) => s + (Number(u.credits) || 0), 0);
                    const sumUnitHours = pfNonEfsrtUnits.reduce((s, u) => s + (Number(u.hours) || 0), 0);
                    const pfEfsrtUnit = (preflightDoc?.efsrtUnit || {}) as { credits?: number; hours?: number };
                    const pfModule = (preflightDoc?.module || {}) as { efsrtHours?: number };
                    const efsrtCr = Number(pfEfsrtUnit.credits ?? 0) || 0;
                    const efsrtHr = Number(pfModule.efsrtHours ?? pfEfsrtUnit.hours ?? 0) || 0;
                    const liveTotalCredits = preflightDoc ? sumUnitCredits + efsrtCr : 0;
                    const liveTotalHours = preflightDoc ? sumUnitHours + efsrtHr : 0;
                    const certMonthName = TITLE_SPANISH_MONTHS[Math.max(0, Math.min(11, Number(emMonth) - 1))] || 'abril';

                    return (
                      <div className="space-y-4">
                        <div className="rounded-xl border border-brand/30 bg-surface p-3.5 space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-brand uppercase tracking-wider">
                              Código de Certificado Modular (Numeración Independiente)
                            </span>
                            <span className="text-[11px] text-muted">
                              Se imprime en anverso (centro y vertical 90°, sin código de barras)
                            </span>
                          </div>
                          <div className="font-mono text-base font-extrabold text-ink tracking-wide tabular-nums">
                            {assembledCertCode || 'Ingrese N° correlativo del certificado (ej. 000001)'}
                          </div>
                          {preflightDoc && (
                            <p className="text-xs text-muted tabular-nums">
                              Resumen verificado de tabla reverso:{' '}
                              <strong className="text-ink">
                                {pfNonEfsrtUnits.length} UD + EFSRT
                              </strong>{' '}
                              · Total exacto: <strong className="text-ink">{liveTotalCredits} créditos</strong> ·{' '}
                              <strong className="text-ink">{liveTotalHours} horas</strong> ·{' '}
                              <strong className="text-ink">{registryForm.certSemesterLabel || 'I Semestre'}</strong>
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label htmlFor="cert-correlative" className="block text-xs font-bold text-ink">
                              1. N° Correlativo Certificado (6 dígitos) *
                            </label>
                            <input
                              id="cert-correlative"
                              type="text"
                              inputMode="numeric"
                              maxLength={6}
                              value={registryForm.certCorrelative ?? ''}
                              onChange={(e) =>
                                updateCertField('certCorrelative', e.target.value.replace(/\D/g, '').slice(0, 6))
                              }
                              onBlur={() => {
                                if (registryForm.certCorrelative) {
                                  updateCertField(
                                    'certCorrelative',
                                    registryForm.certCorrelative.padStart(6, '0')
                                  );
                                }
                              }}
                              placeholder="Ej.: 000001"
                              className="min-h-11 w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-sm font-mono font-bold text-ink tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                            />
                          </div>

                          <div className="space-y-1">
                            <label htmlFor="cert-level" className="block text-xs font-bold text-ink">
                              2. Nivel Formativo
                            </label>
                            <select
                              id="cert-level"
                              value={registryForm.certLevelCode || 'AT'}
                              onChange={(e) => updateCertField('certLevelCode', e.target.value)}
                              className="min-h-11 w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                            >
                              <option value="AT">AT (Auxiliar Técnico)</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label htmlFor="cert-dni-readonly" className="block text-xs font-bold text-ink">
                              3. DNI del Estudiante (BD)
                            </label>
                            <input
                              id="cert-dni-readonly"
                              type="text"
                              readOnly
                              value={dniVal}
                              className="min-h-11 w-full rounded-[10px] border border-line bg-surface-alt px-3 py-2 text-sm font-mono font-semibold text-muted tabular-nums"
                            />
                          </div>

                          <div className="space-y-1 sm:col-span-2">
                            <label htmlFor="cert-student-name" className="block text-xs font-bold text-ink">
                              4. Otorgado a (Anverso) *
                            </label>
                            <input
                              id="cert-student-name"
                              type="text"
                              value={registryForm.certStudentName ?? ''}
                              onChange={(e) => updateCertField('certStudentName', e.target.value)}
                              placeholder="Apellidos y Nombres"
                              className="min-h-11 w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                            />
                          </div>

                          <div className="space-y-1">
                            <label htmlFor="cert-acronym" className="block text-xs font-bold text-ink">
                              5. Sigla de Carrera *
                            </label>
                            <input
                              id="cert-acronym"
                              type="text"
                              maxLength={6}
                              value={registryForm.certProgramAcronym ?? ''}
                              onChange={(e) =>
                                updateCertField('certProgramAcronym', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                              }
                              placeholder="Ej.: CE, CI, MA"
                              className="min-h-11 w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-sm font-mono font-bold text-ink uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                            />
                          </div>

                          <div className="space-y-1">
                            <label htmlFor="cert-short-ref" className="block text-xs font-bold text-ink">
                              6. Año de Término (2 dígitos) *
                            </label>
                            <input
                              id="cert-short-ref"
                              type="text"
                              inputMode="numeric"
                              maxLength={2}
                              value={registryForm.certShortRef ?? ''}
                              onChange={(e) =>
                                updateCertField('certShortRef', e.target.value.replace(/\D/g, '').slice(0, 2))
                              }
                              placeholder="Ej.: 26"
                              className="min-h-11 w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-sm font-mono font-bold text-ink tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                            />
                          </div>

                          <div className="space-y-1">
                            <label htmlFor="cert-code-year" className="block text-xs font-bold text-ink">
                              7. Año de Emisión (4 dígitos) *
                            </label>
                            <input
                              id="cert-code-year"
                              type="text"
                              inputMode="numeric"
                              maxLength={4}
                              value={registryForm.certCodeYear ?? ''}
                              onChange={(e) =>
                                updateCertField('certCodeYear', e.target.value.replace(/\D/g, '').slice(0, 4))
                              }
                              placeholder="Ej.: 2026"
                              className="min-h-11 w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-sm font-mono font-bold text-ink tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                            />
                          </div>

                          <div className="space-y-1">
                            <label htmlFor="cert-semester" className="block text-xs font-bold text-ink">
                              8. Semestre Académico *
                            </label>
                            <select
                              id="cert-semester"
                              value={registryForm.certSemesterLabel || 'I Semestre'}
                              onChange={(e) => updateCertField('certSemesterLabel', e.target.value)}
                              className="min-h-11 w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                            >
                              <option value="I Semestre">I Semestre (Módulo I)</option>
                              <option value="II Semestre">II Semestre (Módulo II)</option>
                            </select>
                          </div>

                          <div className="space-y-1 sm:col-span-2 lg:col-span-3 rounded-xl border border-line bg-surface p-3">
                            <span className="block text-xs font-bold text-ink mb-2">
                              9. Fecha de Emisión del Certificado
                            </span>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label htmlFor="cert-date-day" className="block text-[11px] text-muted mb-1">
                                  Día
                                </label>
                                <input
                                  id="cert-date-day"
                                  type="number"
                                  min={1}
                                  max={31}
                                  value={Number(emDay)}
                                  onChange={(e) => setCertDateParts(emYear, emMonth, e.target.value)}
                                  className="min-h-10 w-full rounded-[10px] border border-line bg-surface-alt px-2.5 py-1.5 text-sm font-semibold text-ink tabular-nums"
                                />
                              </div>
                              <div>
                                <label htmlFor="cert-date-month" className="block text-[11px] text-muted mb-1">
                                  Mes
                                </label>
                                <select
                                  id="cert-date-month"
                                  value={Number(emMonth)}
                                  onChange={(e) => setCertDateParts(emYear, e.target.value, emDay)}
                                  className="min-h-10 w-full rounded-[10px] border border-line bg-surface-alt px-2.5 py-1.5 text-sm font-semibold text-ink"
                                >
                                  {TITLE_SPANISH_MONTHS.map((mName, idx) => (
                                    <option key={mName} value={idx + 1}>
                                      {mName.charAt(0).toUpperCase() + mName.slice(1)}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label htmlFor="cert-date-year" className="block text-[11px] text-muted mb-1">
                                  Año
                                </label>
                                <input
                                  id="cert-date-year"
                                  type="number"
                                  min={2000}
                                  max={2100}
                                  value={Number(emYear)}
                                  onChange={(e) => setCertDateParts(e.target.value, emMonth, emDay)}
                                  className="min-h-10 w-full rounded-[10px] border border-line bg-surface-alt px-2.5 py-1.5 text-sm font-semibold text-ink tabular-nums"
                                />
                              </div>
                            </div>
                            <p className="mt-2 text-xs font-medium text-brand">
                              Texto impreso:{' '}
                              <strong>
                                {`San Miguel ${Number(emDay)} de ${certMonthName} del ${emYear}`}
                              </strong>
                            </p>
                          </div>

                          <div className="space-y-1 sm:col-span-2">
                            <label htmlFor="cert-institution" className="block text-xs font-bold text-ink">
                              10. Institución(es) donde realizó la experiencia (Reverso) *
                            </label>
                            <input
                              id="cert-institution"
                              type="text"
                              value={registryForm.certInstitutionName ?? ''}
                              onChange={(e) => updateCertField('certInstitutionName', e.target.value)}
                              placeholder="CETPRO Micaela Bastidas"
                              className="min-h-11 w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                            />
                          </div>

                          <div className="space-y-1">
                            <label htmlFor="cert-reference-rd" className="block text-xs font-bold text-ink">
                              Resolución Portada (R.D.) *
                            </label>
                            <input
                              id="cert-reference-rd"
                              type="text"
                              value={registryForm.certReferenceResolution ?? ''}
                              onChange={(e) => updateCertField('certReferenceResolution', e.target.value)}
                              placeholder="Ej.: R.D. Nº 3107-2023-DUGEL-SR"
                              className="min-h-11 w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                            />
                          </div>

                          <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                            <label htmlFor="cert-director" className="block text-xs font-bold text-ink">
                              Director Firmante (Anverso)
                            </label>
                            <input
                              id="cert-director"
                              type="text"
                              value={registryForm.certDirectorName ?? ''}
                              onChange={(e) => updateCertField('certDirectorName', e.target.value)}
                              placeholder="Prof. Eloy Valerio Paredes Feliciano"
                              className="min-h-11 w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                            />
                          </div>
                        </div>

                        {registryDirty && (
                          <p className="text-xs font-semibold text-brand" role="status">
                            Hay cambios pendientes. Haga clic en &quot;Guardar y Emitir Certificado (PDF)&quot; para registrar e imprimir.
                          </p>
                        )}
                      </div>
                    );
                  })() : renderRegistryFields(editableRegistryPanelFields)}
                </section>
              )}

            {/* Banner de vigencia y meses para formatos de unidad (TMPL-05 a TMPL-10 y evaluación) */}
            {activeTemplateMeta.scope === 'Unidad' && (
              <section aria-labelledby="document-calendar-title" className="space-y-2 rounded-xl border border-line bg-surface-alt p-4">
                <h3 id="document-calendar-title" className="text-sm font-bold text-ink">
                  Calendario oficial · {selectedUnit}
                </h3>
                <p className="text-sm text-muted tabular-nums">
                  {selectedUnitCalendar.fechaInicio
                    ? `${selectedUnitStartDate} al ${selectedUnitEndDate} · ${selectedUnitCalendar.totalDays} días lectivos programados`
                    : 'Calendario sin configurar para esta unidad.'}
                </p>
                <ul aria-label="Meses que abarca el formato" className="flex flex-wrap gap-2">
                  {selectedUnitCalendar.monthSpans.map((m) => (
                    <li
                      key={m.monthKey}
                      className="rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-ink tabular-nums"
                    >
                      {m.shortLabel} ({m.count} días)
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </section>

          {/* Checklist Preflight Oficial */}
          {preflightDoc && (
            <div className="bg-surface rounded-2xl p-5 border border-line shadow-[var(--ui-shadow)] space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                      preflightDoc.preflight.complete
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                        : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                    }`}
                    aria-hidden="true"
                  >
                    {preflightDoc.preflight.complete ? '✓' : '⚠'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-ink">
                      Checklist Preflight del Documento
                    </h3>
                    {user?.role === 'DIRECTOR' && (
                      <span className="text-[11px] text-muted font-mono tabular-nums truncate block">
                        Huella digital: {preflightDoc.fingerprint.slice(0, 16)}…
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold tabular-nums ${
                      preflightDoc.preflight.complete
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
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
                          ? 'bg-brand-soft/40 border-brand/25 text-ink'
                          : 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-950 dark:text-amber-200'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                          isReady ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                        }`}
                        aria-hidden="true"
                      >
                        {isReady ? '✓' : '○'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <strong className="block text-[11px] truncate">{f.label || f.key}</strong>
                        {user?.role !== 'DOCENTE' && (
                          <span className="text-[10px] text-muted block truncate">
                            Origen: {f.source}
                          </span>
                        )}
                        <span className="text-[11px] font-mono block mt-0.5 text-ink truncate tabular-nums">
                          {isReady ? f.value : 'Pendiente de registrar'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Advertencias emitidas por el backend */}
              {preflightDoc.warnings && preflightDoc.warnings.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
                  <strong className="block font-bold">Observaciones del motor documental:</strong>
                  {preflightDoc.warnings.map((w, idx) => (
                    <p key={idx}>• {w}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Visualizador PDF Integrado */}
          {pdfBlob && !(isTitle && registryDirty && !demoFill) ? (
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
                      className="min-h-[44px] px-3 py-1.5 rounded-[10px] bg-amber-400 hover:bg-amber-300 text-amber-950 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                      title="Llenar toda la asistencia de la unidad con marcas sintéticas reales"
                    >
                      {isSimulatingAttendance ? 'Llenando…' : 'Llenar Asistencia (Demo)'}
                    </button>

                    <button
                      type="button"
                      onClick={handleClearSimulatedAttendance}
                      disabled={isSimulatingAttendance}
                      className="min-h-[44px] px-3 py-1.5 rounded-[10px] bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                      title="Limpiar marcas de asistencia registradas en esta unidad"
                    >
                      Limpiar
                    </button>
                  </div>
                )
              }
            />
          ) : (
            <div className="bg-surface rounded-2xl p-12 border border-line shadow-[var(--ui-shadow)] text-center">
              <div className="w-16 h-16 rounded-2xl bg-surface-alt border border-line text-muted flex items-center justify-center mx-auto mb-3">
                <DocumentIcon className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-ink">Vista Previa del Documento</h3>
              <p className="text-xs text-muted mt-1 max-w-sm mx-auto leading-relaxed">
                Haga clic en <strong>"Ver formato rellenado"</strong> para generar el archivo PDF oficial
                y visualizarlo en el visor interactivo de alta resolución.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 5. Historial de Emisiones Oficiales y Duplicados Exactos */}
      <section
        aria-labelledby="emissions-history-title"
        className="bg-surface rounded-2xl border border-line shadow-[var(--ui-shadow)] overflow-hidden"
      >
        <div className="p-4 sm:p-5 border-b border-line flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-[10px] bg-brand-soft text-brand flex items-center justify-center shrink-0">
                <ClockIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="emissions-history-title" className="text-sm font-bold text-ink tracking-tight">
                    Historial de Títulos y Emisiones · Duplicados Exactos
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-surface-alt border border-line text-ink tabular-nums">
                    {visibleEmissions.length} registro(s)
                  </span>
                </div>
                <p className="text-[11px] text-muted truncate">
                  {emissionsGlobalScope || selectedTemplateId === 'TMPL-21'
                    ? 'Mostrando registros de todas las aulas y carreras (busque por DNI, nombre o código para reimprimir duplicados)'
                    : `Emisiones registradas para el aula ${currentGroup?.name || activeWorkspace.groupId}${activeWorkspace.year ? ` · Año ${activeWorkspace.year}` : ''}`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Ámbito de búsqueda de emisiones"
                value={emissionsGlobalScope || selectedTemplateId === 'TMPL-21' ? 'ALL_GROUPS' : 'GROUP'}
                onChange={(e) => setEmissionsGlobalScope(e.target.value === 'ALL_GROUPS')}
                className="min-h-[40px] rounded-[10px] border border-line bg-surface-alt px-3 py-1.5 text-xs font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <option value="ALL_GROUPS">Todas las carreras y aulas</option>
                <option value="GROUP">Solo aula activa</option>
              </select>

              <select
                aria-label="Filtrar historial por formato"
                value={emissionsTemplateFilter}
                onChange={(e) => setEmissionsTemplateFilter(e.target.value as 'ALL' | 'SELECTED')}
                className="min-h-[40px] rounded-[10px] border border-line bg-surface-alt px-3 py-1.5 text-xs font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <option value="ALL">Todos los formatos</option>
                <option value="SELECTED">Solo {activeTemplateMeta.id}</option>
              </select>

              <button
                type="button"
                onClick={loadEmissions}
                disabled={isLoadingEmissions}
                className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-surface-alt border border-line hover:bg-brand-soft text-ink hover:text-brand text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand"
              >
                <RefreshIcon className={`w-3.5 h-3.5 ${isLoadingEmissions ? 'animate-spin' : ''}`} />
                <span>Actualizar</span>
              </button>

              <button
                type="button"
                onClick={() => setIsEmissionsExpanded((prev) => !prev)}
                aria-expanded={isEmissionsExpanded}
                className="min-h-[40px] px-3 py-1.5 rounded-[10px] bg-surface-alt border border-line hover:bg-brand-soft text-ink hover:text-brand text-xs font-bold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-brand"
              >
                {isEmissionsExpanded ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          {isEmissionsExpanded && (
            <div className="relative max-w-lg">
              <SearchIcon className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                aria-label="Buscar título o documento emitido por DNI, nombre o código"
                value={emissionsSearchQuery}
                onChange={(e) => setEmissionsSearchQuery(e.target.value)}
                placeholder="Buscar duplicado por DNI (ej. 01343977), nombre o código (ej. 000174)…"
                className="min-h-[42px] w-full pl-9 pr-3.5 py-2 rounded-[10px] border border-line bg-surface-alt text-xs font-medium text-ink placeholder:text-muted focus:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              />
            </div>
          )}
        </div>

        {isEmissionsExpanded && (
          <div className="p-4 sm:p-5 space-y-3">
            {emissionsError && (
              <div
                role="status"
                className="p-3 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-900 dark:text-amber-200"
              >
                {emissionsError}
              </div>
            )}

            {isLoadingEmissions && visibleEmissions.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted">
                Consultando historial de emisiones registradas…
              </div>
            ) : visibleEmissions.length === 0 ? (
              <div className="py-8 px-4 text-center text-xs text-muted bg-surface-alt rounded-xl border border-line">
                No se encontraron emisiones registradas para este filtro o búsqueda.
                Genere un documento oficial o título para conservar su copia fiel y poder reimprimir duplicados.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-surface-alt border-b border-line text-[11px] font-bold text-muted uppercase tracking-wider">
                      <th className="py-2.5 px-3">N.º Correlativo</th>
                      <th className="py-2.5 px-3">Fecha</th>
                      <th className="py-2.5 px-3">Plantilla</th>
                      <th className="py-2.5 px-3">Estudiante / Titulado</th>
                      <th className="py-2.5 px-3">Códigos Institucional / UGEL</th>
                      <th className="py-2.5 px-3">Estado</th>
                      <th className="py-2.5 px-3">Hash SHA-256</th>
                      <th className="py-2.5 px-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {visibleEmissions.map((em) => {
                      const statusLabel = em.demoMode
                        ? 'Demo'
                        : em.isDraft
                        ? 'Borrador'
                        : 'Oficial';
                      const statusStyle = em.demoMode
                        ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800/60'
                        : em.isDraft
                        ? 'bg-slate-100 dark:bg-slate-800/70 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/60';
                      const displayStudent = em.titleSnapshot?.tituladoName || em.studentName;
                      const displayCorrelative =
                        em.correlative ||
                        em.titleSnapshot?.correlative ||
                        (em.registerCode && /^(\d{1,6})(?=-)/.exec(em.registerCode)?.[1]?.padStart(6, '0')) ||
                        (em.resolutionNumber && /^(\d{1,6})(?=-)/.exec(em.resolutionNumber)?.[1]?.padStart(6, '0')) ||
                        '';
                      const scopeText = displayStudent
                        ? `${displayStudent}${em.studentDni ? ` (DNI: ${em.studentDni})` : ''}`
                        : em.unit
                        ? `Grupo · ${em.unit}`
                        : 'Módulo / Aula completa';
                      const canReprint = !em.demoMode && ['TMPL-20', 'TMPL-21', 'TMPL-22', 'TMPL-23'].includes(em.templateId);
                      const canDelete = user?.role !== 'DOCENTE';

                      return (
                        <tr key={em.id} className="hover:bg-surface-alt/60 transition-colors">
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-ink tabular-nums">
                            {displayCorrelative ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-surface-alt border border-line text-xs font-bold text-ink">
                                {displayCorrelative}
                              </span>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap tabular-nums text-ink">
                            {formatEmissionTimestamp(em.issuedAt)}
                          </td>
                          <td className="py-2.5 px-3 min-w-[160px]">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-brand tabular-nums">
                                {em.templateId}
                              </span>
                              {em.official2026 && (
                                <span className="px-1.5 py-0.5 rounded bg-brand-soft text-brand text-[10px] font-bold">
                                  2026
                                </span>
                              )}
                            </div>
                            <span className="block text-[11px] text-muted truncate max-w-[200px]">
                              {em.templateName}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-ink min-w-[190px]">
                            <span className="block font-semibold break-words">{scopeText}</span>
                            {em.titleSnapshot?.officialTitleText && (
                              <span className="block text-[10px] text-muted truncate max-w-[230px]">
                                {em.titleSnapshot.officialTitleText}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-ink tabular-nums min-w-[190px]">
                            {em.registerCode || em.resolutionNumber || em.ugelCode ? (
                              <div className="space-y-0.5">
                                {em.registerCode && (
                                  <span className="block">Reg: {em.registerCode}</span>
                                )}
                                {em.resolutionNumber && (
                                  <span className="block text-muted">RD: {em.resolutionNumber}</span>
                                )}
                                {em.ugelCode && (
                                  <span className="block text-muted">UGEL: {em.ugelCode}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${statusStyle}`}
                            >
                              {statusLabel}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-muted tabular-nums">
                            <span title={em.pdfHash}>
                              {em.pdfHash ? `${em.pdfHash.slice(0, 12)}…` : '—'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-2">
                              {canReprint && (
                                <button
                                  type="button"
                                  onClick={() => handleReprintDuplicate(em)}
                                  disabled={reprintingEmissionId === em.id || deletingEmissionId === em.id}
                                  className="min-h-[38px] px-3 py-1.5 rounded-[10px] bg-brand-soft hover:bg-brand text-brand hover:text-on-brand border border-brand/30 text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                  {reprintingEmissionId === em.id
                                    ? 'Reimprimiendo…'
                                    : 'Reimprimir duplicado'}
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteEmission(em)}
                                  disabled={deletingEmissionId === em.id || reprintingEmissionId === em.id}
                                  aria-label={`Eliminar emisión ${em.registerCode || em.id}`}
                                  className="min-h-[38px] px-3 py-1.5 rounded-[10px] bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white dark:bg-rose-950/40 dark:hover:bg-rose-700 dark:text-rose-200 border border-rose-200 dark:border-rose-800/60 text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                  {deletingEmissionId === em.id ? 'Eliminando…' : 'Eliminar'}
                                </button>
                              )}
                              {!canReprint && !canDelete && (
                                <span className="text-[11px] text-muted">—</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Modal de Confirmación para Eliminar Emisión / Liberar Correlativo */}
      {confirmDeleteEmission && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-delete-emission-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-xl space-y-4">
            <div className="space-y-1">
              <h3 id="confirm-delete-emission-title" className="text-base font-bold text-ink">
                ¿Eliminar título / emisión del historial?
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                Esta acción eliminará el registro seleccionado de la lista de duplicados exactos. Si tuvo un correlativo asignado, quedará libre para volver a emitir el título corregido.
              </p>
            </div>
            <div className="rounded-xl border border-line bg-surface-alt p-3 space-y-1 text-xs">
              <p className="font-semibold text-ink">
                {confirmDeleteEmission.titleSnapshot?.tituladoName ||
                  confirmDeleteEmission.studentName ||
                  confirmDeleteEmission.templateName}
              </p>
              {(confirmDeleteEmission.correlative || confirmDeleteEmission.titleSnapshot?.correlative) && (
                <p className="font-mono text-ink">
                  N.º Correlativo:{' '}
                  <strong>
                    {confirmDeleteEmission.correlative || confirmDeleteEmission.titleSnapshot?.correlative}
                  </strong>
                </p>
              )}
              {confirmDeleteEmission.registerCode && (
                <p className="font-mono text-muted">
                  Código Inst.: {confirmDeleteEmission.registerCode}
                </p>
              )}
              {confirmDeleteEmission.ugelCode && (
                <p className="font-mono text-muted">
                  Código UGEL: {confirmDeleteEmission.ugelCode}
                </p>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmDeleteEmission(null)}
                disabled={Boolean(deletingEmissionId)}
                className="min-h-[40px] px-4 py-2 rounded-[10px] border border-line bg-surface-alt hover:bg-surface text-xs font-bold text-ink cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteEmission}
                disabled={Boolean(deletingEmissionId)}
                className="min-h-[40px] px-4 py-2 rounded-[10px] bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white cursor-pointer disabled:opacity-50"
              >
                {deletingEmissionId ? 'Eliminando…' : 'Sí, eliminar registro'}
              </button>
            </div>
          </div>
        </div>
      )}

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
